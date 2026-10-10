import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SocketManager from '~/helpers/SocketManager.js';

/** @type {Function} The listener the manager registered on the stubbed socket. */
let listener;
/** @type {{event: string, data: object, options: object}[]} What the manager emitted. */
let emitted;
/** @type {object|null} The stubbed active GM. */
let activeGM;
/** @type {{id: string}} The stubbed local user. */
let localUser;
/** @type {Function} The stubbed `Hooks.callAll`. */
let callAll;

beforeEach(() => {
   vi.useFakeTimers();
   emitted = [];
   activeGM = {
      id: 'gm1',
      isSelf: false,
   };
   localUser = { id: 'me' };
   callAll = vi.fn();
   vi.stubGlobal('game', {
      socket: {
         on: (event, callback) => {
            listener = callback;
         },
         emit: (event, data, options) => {
            emitted.push({
               event,
               data,
               options,
            });
         },
      },
      users: {
         get activeGM() {
            return activeGM;
         },
      },
      user: localUser,
   });
   vi.stubGlobal('Hooks', { callAll });
   vi.stubGlobal('ui', { notifications: { warn: vi.fn() } });
   vi.spyOn(console, 'warn').mockImplementation(() => {});
   vi.stubGlobal('foundry', { utils: { randomID: () => `id${emitted.length}` } });
});

afterEach(() => {
   vi.useRealTimers();
   vi.unstubAllGlobals();
});

describe('SocketManager.request', () => {
   it('rejects at once when no GM is connected and sends nothing', async () => {
      activeGM = null;
      const manager = new SocketManager();
      await expect(manager.request('r')).rejects.toThrow('needs a GM');
      expect(emitted).toEqual([]);
   });

   it('resolves with the active GM\'s answer and ignores an answer from any other sender', async () => {
      const manager = new SocketManager();
      const pending = manager.request('r', 1, 2);
      expect(emitted[0].data).toEqual({
         request: 'r',
         requestId: 'id0',
         args: [
            1,
            2,
         ],
      });
      listener({
         reply: 'id0',
         ok: true,
         value: 'forged',
      }, 'someoneElse');
      listener({
         reply: 'id0',
         ok: true,
         value: 'real',
      }, 'gm1');
      await expect(pending).resolves.toBe('real');
   });

   it('rejects with the GM\'s reason when the handler refused', async () => {
      const manager = new SocketManager();
      const pending = manager.request('r');
      listener({
         reply: 'id0',
         ok: false,
         error: 'not yours',
      }, 'gm1');
      await expect(pending).rejects.toThrow('not yours');
   });

   it('gives up after 5 seconds and ignores a late answer', async () => {
      const manager = new SocketManager();
      const pending = manager.request('r');
      const outcome = expect(pending).rejects.toThrow('No GM answered');
      await vi.advanceTimersByTimeAsync(5000);
      await outcome;
      expect(() => listener({
         reply: 'id0',
         ok: true,
         value: 'late',
      }, 'gm1')).not.toThrow();
   });

   it('does not give up before 5 seconds', async () => {
      const manager = new SocketManager();
      const pending = manager.request('r');
      const settled = vi.fn();
      pending.then(settled, settled);
      await vi.advanceTimersByTimeAsync(4999);
      expect(settled).not.toHaveBeenCalled();
      listener({
         reply: 'id0',
         ok: true,
         value: 1,
      }, 'gm1');
      await expect(pending).resolves.toBe(1);
   });
});

describe('SocketManager request handlers', () => {
   beforeEach(() => {
      activeGM.isSelf = true;
   });

   it('runs the handler with the transport\'s sender, not a sender field of the message', async () => {
      const manager = new SocketManager();
      const handler = vi.fn(async () => 'done');
      manager.registerRequestHandler('r', handler);
      listener({
         request: 'r',
         requestId: 'q1',
         senderId: 'gm1',
         args: [
            'x',
            2,
         ],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(handler).toHaveBeenCalledWith('player1', 'x', 2);
      expect(emitted[0]).toEqual({
         event: 'system.titan',
         data: {
            reply: 'q1',
            ok: true,
            value: 'done',
            error: '',
         },
         options: { recipients: ['player1'] },
      });
   });

   it('answers ok:false with the reason when the handler throws', async () => {
      const manager = new SocketManager();
      manager.registerRequestHandler('r', () => {
         throw new Error('refused');
      });
      listener({
         request: 'r',
         requestId: 'q1',
         args: [],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(emitted[0].data).toMatchObject({
         ok: false,
         error: 'refused',
      });
   });

   it('answers ok:false for a request with no handler', async () => {
      const manager = new SocketManager();
      listener({
         request: 'unknown',
         requestId: 'q1',
         args: [],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(emitted[0].data).toMatchObject({
         ok: false,
         error: expect.stringContaining('no handler'),
      });
   });

   it('treats arguments that are not an array as none', async () => {
      const manager = new SocketManager();
      const handler = vi.fn();
      manager.registerRequestHandler('r', handler);
      listener({
         request: 'r',
         requestId: 'q1',
         args: 'x',
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(handler).toHaveBeenCalledWith('player1');
   });

   it('does nothing on a client that is not the active GM\'s', async () => {
      activeGM.isSelf = false;
      const manager = new SocketManager();
      const handler = vi.fn();
      manager.registerRequestHandler('r', handler);
      listener({
         request: 'r',
         requestId: 'q1',
         args: [],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(handler).not.toHaveBeenCalled();
      expect(emitted).toEqual([]);
   });
});

describe('SocketManager mirrored hooks', () => {
   it('fires no hook that was not registered, whoever sends it', async () => {
      const manager = new SocketManager();
      listener({
         id: 'forged',
         args: [],
      }, 'player1');
      manager.triggerSocketHook('alsoForged');
      await vi.advanceTimersByTimeAsync(0);
      expect(callAll).not.toHaveBeenCalled();
   });

   it('fires a registered hook from a remote sender only when its authorization allows the sender', async () => {
      const manager = new SocketManager();
      const authorize = vi.fn(async (senderId) => senderId === 'gm1');
      manager.registerMirroredHook('turn', authorize);
      listener({
         id: 'turn',
         args: [1],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(callAll).not.toHaveBeenCalled();
      listener({
         id: 'turn',
         args: [1],
      }, 'gm1');
      await vi.advanceTimersByTimeAsync(0);
      expect(authorize).toHaveBeenCalledWith('gm1', 1);
      expect(callAll).toHaveBeenCalledWith('turn', 1);
   });

   it('fires a registered hook for the local user without asking, and broadcasts it', async () => {
      const manager = new SocketManager();
      const authorize = vi.fn(async () => false);
      manager.registerMirroredHook('turn', authorize);
      manager.triggerSocketHook('turn', 'a');
      await vi.advanceTimersByTimeAsync(0);
      expect(authorize).not.toHaveBeenCalled();
      expect(callAll).toHaveBeenCalledWith('turn', 'a');
      expect(emitted[0].data).toEqual({
         id: 'turn',
         args: ['a'],
      });
   });

   it('fires a registered hook with no authorization for any remote sender', async () => {
      const manager = new SocketManager();
      manager.registerMirroredHook('open');
      listener({
         id: 'open',
         args: [],
      }, 'player1');
      await vi.advanceTimersByTimeAsync(0);
      expect(callAll).toHaveBeenCalledWith('open');
   });
});
