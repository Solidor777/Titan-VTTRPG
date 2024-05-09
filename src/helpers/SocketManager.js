/**
 * Class for managing Socket Events sent by this system.
 */
export default class SocketManager {
   /**
    * Class for managing Socket Events sent by this system.
    */
   constructor() {
      // Bind the received function to the socket for this system.
      game.socket.on(SOCKET_NAME, this._onSocketReceived.bind(this));
   }

   /**
    * Called when a socket is received from this system.
    * Performs functions and replication as appropriate.
    * @param {object}   message  The message that was sent.
    * @param {string}   senderId The ID of the user sending the message.
    * @private
    */
   _onSocketReceived(message, senderId) {
      Hooks.callAll(message.id, ...message.args);
   }

   /**
    * Triggers a Hook from a message sent by the system's socket.
    * @param {string} id   ID of the Hook to send.
    * @param {*[]} args    Arguments to send with the Hook.
    */
   triggerSocketHook(id, ...args) {
      const message = {
         id: id,
         args: args,
      };
      this._onSocketReceived(message, game.user.id);
      game.socket.emit(SOCKET_NAME, message);
   }
}

const SOCKET_NAME = 'system.titan';
