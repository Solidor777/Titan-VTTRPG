import { beforeEach, describe, expect, it, vi } from 'vitest';

// Shared mocked Svelte unmount with a stable identity across vi.resetModules() re-imports.
const mocks = vi.hoisted(() => {
   return { unmount: vi.fn() };
});

vi.mock('svelte', async (importOriginal) => {
   return {
      ...(await importOriginal()),
      unmount: mocks.unmount,
   };
});

/** @type {object} The freshly imported registry module under test (module state reset per test). */
let registry;

/**
 * Creates a chat-card stand-in element carrying a message id.
 * @param {string} messageId - The message id for the element's dataset.
 * @returns {HTMLElement} The created (detached) element.
 */
function cardElement(messageId) {
   const element = document.createElement('li');
   element.dataset.messageId = messageId;
   return element;
}

/**
 * Builds the notification pane DOM the registry's observer attaches to.
 * @returns {HTMLElement} The notification pane's chat-log list element.
 */
function buildNotificationPane() {
   const pane = document.createElement('div');
   pane.id = 'chat-notifications';
   const log = document.createElement('ol');
   log.classList.add('chat-log');
   pane.append(log);
   document.body.append(pane);
   return log;
}

beforeEach(async () => {
   vi.resetModules();
   mocks.unmount.mockReset();
   document.body.innerHTML = '';
   registry = await import('~/document/types/chat-message/ChatMessageMountRegistry.js');
});

describe('sweepStaleMounts', () => {
   it('keeps connected mounts and unmounts them once disconnected', () => {
      const element = cardElement('m1');
      document.body.append(element);
      registry.registerMount(element, 'm1', { id: 'handle-1' });

      registry.sweepStaleMounts();
      expect(mocks.unmount).not.toHaveBeenCalled();

      element.remove();
      registry.sweepStaleMounts();
      expect(mocks.unmount).toHaveBeenCalledTimes(1);
      expect(mocks.unmount).toHaveBeenCalledWith({ id: 'handle-1' }, { outro: false });
   });

   it('skips never-connected mounts (batch insertion race)', () => {
      const element = cardElement('m1');
      registry.registerMount(element, 'm1', { id: 'handle-1' });

      registry.sweepStaleMounts();
      registry.sweepStaleMounts();
      expect(mocks.unmount).not.toHaveBeenCalled();

      // Once inserted then removed, the mount becomes sweepable.
      document.body.append(element);
      registry.sweepStaleMounts();
      element.remove();
      registry.sweepStaleMounts();
      expect(mocks.unmount).toHaveBeenCalledTimes(1);
   });
});

describe('teardownMessageMounts', () => {
   it('unmounts every mount for the message, connected or not, and only that message', () => {
      const connected = cardElement('m1');
      document.body.append(connected);
      const detached = cardElement('m1');
      const other = cardElement('m2');
      document.body.append(other);
      registry.registerMount(connected, 'm1', { id: 'h1' });
      registry.registerMount(detached, 'm1', { id: 'h2' });
      registry.registerMount(other, 'm2', { id: 'h3' });

      registry.teardownMessageMounts('m1');
      expect(mocks.unmount).toHaveBeenCalledTimes(2);
      expect(mocks.unmount).toHaveBeenCalledWith({ id: 'h1' }, { outro: false });
      expect(mocks.unmount).toHaveBeenCalledWith({ id: 'h2' }, { outro: false });

      // Repeat teardown is a no-op; the other message's mount is untouched.
      registry.teardownMessageMounts('m1');
      expect(mocks.unmount).toHaveBeenCalledTimes(2);
   });

   it('drops an entry even when its unmount throws, without stranding the rest', () => {
      const first = cardElement('m1');
      const second = cardElement('m1');
      registry.registerMount(first, 'm1', { id: 'h1' });
      registry.registerMount(second, 'm1', { id: 'h2' });
      mocks.unmount.mockImplementationOnce(() => {
         throw new Error('corrupt handle');
      });

      expect(() => registry.teardownMessageMounts('m1')).not.toThrow();
      expect(mocks.unmount).toHaveBeenCalledTimes(2);

      // Both entries are gone: a second teardown attempts nothing further.
      registry.teardownMessageMounts('m1');
      expect(mocks.unmount).toHaveBeenCalledTimes(2);
   });
});

describe('notification observer', () => {
   it('unmounts a tracked card removed from the notification pane', async () => {
      const log = buildNotificationPane();
      const element = cardElement('m1');
      log.append(element);
      registry.registerMount(element, 'm1', { id: 'h1' });

      element.remove();
      await vi.waitFor(() => {
         expect(mocks.unmount).toHaveBeenCalledTimes(1);
      });
   });

   it('unmounts tracked descendants of a removed wrapper', async () => {
      const log = buildNotificationPane();
      const wrapper = document.createElement('div');
      const element = cardElement('m1');
      wrapper.append(element);
      log.append(wrapper);
      registry.registerMount(element, 'm1', { id: 'h1' });

      wrapper.remove();
      await vi.waitFor(() => {
         expect(mocks.unmount).toHaveBeenCalledTimes(1);
      });
   });

   it('re-attaches when the notification log element is replaced', async () => {
      const staleLog = buildNotificationPane();
      const staleElement = cardElement('m1');
      staleLog.append(staleElement);
      registry.registerMount(staleElement, 'm1', { id: 'h1' });

      // Replace the entire pane (simulates a rebuilt notifications element).
      document.body.innerHTML = '';
      const freshLog = buildNotificationPane();
      const freshElement = cardElement('m2');
      freshLog.append(freshElement);
      registry.registerMount(freshElement, 'm2', { id: 'h2' });

      freshElement.remove();
      await vi.waitFor(() => {
         expect(mocks.unmount).toHaveBeenCalledWith({ id: 'h2' }, { outro: false });
      });
   });
});
