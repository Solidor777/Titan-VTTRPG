import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Class for managing Socket Events sent by this system. Two kinds of message travel on the system socket:
 * hook broadcasts (`triggerSocketHook`), whose arguments are the sender's own claims, and requests to the active GM
 * (`request`), whose handlers receive the sender's identity from the transport and never from the message.
 * Source of the identity: Foundry's server appends the sending user's id, taken from the socket's authenticated
 * session, as the second listener argument of every package socket event (`dist/packages/package.mjs`
 * `registerCustomSocket` and `dist/server/sockets.mjs` `handleCustomSocket`, core build 364). A client cannot set it.
 */
export default class SocketManager {
   /** @type {Map<string, Function>} The request handlers by request name; only the active GM's client runs them. */
   #handlers = new Map();

   /** @type {Map<string, Function|undefined>} The hooks a remote client may fire here, with their authorization. */
   #mirroredHooks = new Map();

   /** @type {Map<string, {resolve: Function, reject: Function, timer: number}>} Requests awaiting an answer. */
   #pending = new Map();

   constructor() {
      // Bind the received function to the socket for this system.
      game.socket.on(SOCKET_NAME, this._onSocketReceived.bind(this));
   }

   /**
    * Called when a socket is received from this system. Performs functions and replication as appropriate.
    * @param {object} message - The message that was sent.
    * @param {string} senderId - The ID of the user sending the message, as the server reports it.
    * @private
    */
   _onSocketReceived(message, senderId) {
      if (message.request !== undefined) {
         this.#onRequest(message, senderId);
      }
      else if (message.reply !== undefined) {
         this.#onReply(message, senderId);
      }
      else {
         this.#onHook(message, senderId);
      }
   }

   /**
    * Fires a mirrored hook. Only hooks registered with `registerMirroredHook` can be fired from the transport, and a
    * remote sender must pass the hook's authorization with the sender id the server reports.
    * @param {object} message - The hook message: `{ id, args }`.
    * @param {string} senderId - The ID of the user who sent it, as the server reports it.
    * @returns {Promise<void>} Resolves once the hook has fired or been refused.
    */
   async #onHook(message, senderId) {
      if (!this.#mirroredHooks.has(message.id) || !Array.isArray(message.args)) {
         warn(`A socket message named the hook "${message.id}", which is not mirrored; it was refused.`, senderId);
         return;
      }

      /** @type {Function|undefined} The hook's authorization. */
      const authorize = this.#mirroredHooks.get(message.id);
      if (senderId !== game.user.id && authorize && !await authorize(senderId, ...message.args)) {
         warn(`The mirrored hook "${message.id}" was refused: its sender may not fire it.`, senderId);
         return;
      }
      Hooks.callAll(message.id, ...message.args);
   }

   /**
    * Registers a hook that `triggerSocketHook` mirrors to every client. A hook that is not registered cannot be fired
    * by a message on the socket, whoever sends it.
    * @param {string} id - The hook name.
    * @param {(senderId: string, ...args: *[]) => Promise<boolean>|boolean} [authorize] - Decides whether a remote
    * sender may fire the hook here, from the sender the server reports and the hook's arguments; without it any
    * connected user may.
    */
   registerMirroredHook(id, authorize = undefined) {
      this.#mirroredHooks.set(id, authorize);
   }

   /**
    * Triggers a Hook from a message sent by the system's socket.
    * @param {string} id - ID of the Hook to send.
    * @param {...*} args - Arguments to send with the Hook.
    */
   triggerSocketHook(id, ...args) {
      const message = {
         id: id,
         args: args,
      };
      this._onSocketReceived(message, game.user.id);
      game.socket.emit(SOCKET_NAME, message);
   }

   /**
    * Registers the function that answers a named request. The function runs on the active GM's client only.
    * @param {string} name - The request name.
    * @param {(senderId: string, ...args: *[]) => Promise<*>|*} handler - Receives the transport's sender id, then the
    * request's arguments; its return value answers the request and an error it throws refuses it.
    */
   registerRequestHandler(name, handler) {
      this.#handlers.set(name, handler);
   }

   /**
    * Asks the active GM's client to act for this user and waits for its answer.
    * @param {string} name - The name of a request the GM's client has a handler for.
    * @param {...*} args - The request's arguments; they must not carry the requester's identity.
    * @returns {Promise<*>} Resolves with the handler's answer; rejects with the reason when the handler refuses, when
    * no GM is connected, or when no answer arrives in time.
    */
   request(name, ...args) {
      if (!game.users.activeGM) {
         return Promise.reject(new Error('This change needs a GM to be connected.'));
      }

      /** @type {string} The id that pairs the answer with this request. */
      const requestId = foundry.utils.randomID();
      return new Promise((resolve, reject) => {
         /** @type {number} The timer that gives up on an unanswered request. */
         const timer = setTimeout(() => {
            this.#pending.delete(requestId);
            reject(new Error('No GM answered the request.'));
         }, REQUEST_TIMEOUT_MS);
         this.#pending.set(requestId, {
            resolve,
            reject,
            timer,
         });
         game.socket.emit(SOCKET_NAME, {
            request: name,
            requestId,
            args,
         });
      });
   }

   /**
    * Runs a request's handler on the active GM's client and sends the answer back to the sender.
    * @param {object} message - The request: `{ request, requestId, args }`.
    * @param {string} senderId - The ID of the user who sent it, as the server reports it.
    * @returns {Promise<void>} Resolves once the answer is sent.
    */
   async #onRequest(message, senderId) {
      if (!game.users.activeGM?.isSelf) {
         return;
      }

      /** @type {{reply: string, ok: boolean, value: *, error: string}} The answer. */
      const answer = {
         reply: message.requestId,
         ok: true,
         value: undefined,
         error: '',
      };
      try {
         const handler = this.#handlers.get(message.request);
         if (!handler) {
            throw new Error(`The GM's client has no handler for "${message.request}".`);
         }
         answer.value = await handler(senderId, ...(Array.isArray(message.args) ? message.args : []));
      }
      catch (error) {
         answer.ok = false;
         answer.error = error.message;
      }
      game.socket.emit(SOCKET_NAME, answer, { recipients: [senderId] });
   }

   /**
    * Settles the pending request an answer belongs to. Only the active GM's answers count.
    * @param {object} message - The answer: `{ reply, ok, value, error }`.
    * @param {string} senderId - The ID of the user who sent it, as the server reports it.
    */
   #onReply(message, senderId) {
      const pending = this.#pending.get(message.reply);
      if (!pending || senderId !== game.users.activeGM?.id) {
         return;
      }
      clearTimeout(pending.timer);
      this.#pending.delete(message.reply);
      if (message.ok) {
         pending.resolve(message.value);
      }
      else {
         pending.reject(new Error(message.error));
      }
   }
}

/** @type {string} */
const SOCKET_NAME = 'system.titan';

/** @type {number} How long a request waits for the GM's answer before it gives up, in milliseconds. */
const REQUEST_TIMEOUT_MS = 5000;
