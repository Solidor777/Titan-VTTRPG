import { unmount } from 'svelte';

/**
 * @typedef {object} ChatMessageMountEntry
 * @property {object} handle - The Svelte mount handle returned by `mount()`.
 * @property {string} messageId - The id of the chat message the mount renders.
 * @property {boolean} seen - Whether the element has been observed connected at least once.
 */

/**
 * Live chat-card Svelte mounts, keyed by the rendered card root element. One message renders into up
 * to three elements (main chat log, notification pane, chat popout), each holding its own mount.
 * @type {Map<HTMLElement, ChatMessageMountEntry>}
 */
const mounts = new Map();

/** @type {HTMLElement | undefined} The notification-pane log element currently under observation. */
let observedNotificationLog = void 0;

/** @type {MutationObserver | undefined} Observer tearing down mounts removed from the notification pane. */
let notificationObserver = void 0;

/**
 * Registers a mounted chat-card Svelte component for lifecycle tracking, keyed by its rendered root
 * element, and lazily (re)attaches the notification-pane removal observer. Re-registering an already
 * tracked element first tears down the existing entry, so the prior handle can never leak.
 * @param {HTMLElement} element - The rendered chat-card root element (the chat-log `li`).
 * @param {string} messageId - The id of the chat message the mount renders.
 * @param {object} handle - The Svelte mount handle returned by `mount()`.
 * @returns {void}
 */
export function registerMount(element, messageId, handle) {
   /** @type {ChatMessageMountEntry | undefined} The entry already tracking this element, when re-registering. */
   const existing = mounts.get(element);
   if (existing) {
      unmountEntry(element, existing);
   }

   mounts.set(element, {
      handle: handle,
      messageId: messageId,
      seen: false,
   });
   attachNotificationObserver();
}

/**
 * Unmounts every tracked component whose element has left the DOM after having been connected.
 * Never-yet-connected entries are skipped: Foundry's `ChatLog##doRenderBatch` renders an entire batch
 * BEFORE inserting any element, so a sweep may fire while a batch's mounts await insertion.
 * @returns {void}
 */
export function sweepStaleMounts() {
   for (const [element, entry] of mounts) {
      if (element.isConnected) {
         entry.seen = true;
      }
      else if (entry.seen) {
         unmountEntry(element, entry);
      }
   }
}

/**
 * Unmounts and drops every tracked component rendering the given message, connected or not.
 * @param {string} messageId - The id of the chat message being torn down.
 * @returns {void}
 */
export function teardownMessageMounts(messageId) {
   for (const [element, entry] of mounts) {
      if (entry.messageId === messageId) {
         unmountEntry(element, entry);
      }
   }
}

/**
 * Drops a registry entry and unmounts its component. The entry is removed even when the unmount
 * throws, so one corrupt handle can never strand other teardowns.
 * @param {HTMLElement} element - The tracked chat-card root element.
 * @param {ChatMessageMountEntry} entry - The registry entry being torn down.
 * @returns {void}
 */
function unmountEntry(element, entry) {
   mounts.delete(element);
   try {
      unmount(entry.handle, { outro: false });
   }
   catch (error) {
      console.error('TITAN | Failed to unmount a chat-card Svelte component.', error);
   }
}

/**
 * Attaches the notification-pane removal observer when the pane's log element exists and is not
 * already under observation. Notification dismissal removes elements with NO adjacent render
 * (`ChatLog##dismissNotification` → `element.remove()`), so removal must be observed directly; every
 * other removal path is reaped by a sweep. Idempotent; lazily re-checked on every `registerMount`.
 * Accepted bounded retention: if the pane is removed and never re-created, the observer and its
 * detached log element are retained until the next pane creation re-attaches.
 * @returns {void}
 */
function attachNotificationObserver() {
   /** @type {HTMLElement | null} The notification pane's chat log, when rendered. */
   const log = globalThis.document?.querySelector('#chat-notifications .chat-log') ?? null;
   if (!log || log === observedNotificationLog) {
      return;
   }

   notificationObserver?.disconnect();
   notificationObserver = new MutationObserver(onNotificationLogMutation);
   notificationObserver.observe(log, { childList: true });
   observedNotificationLog = log;
}

/**
 * Tears down the mounts of chat-card elements removed from the notification pane — the removed node
 * itself when tracked, plus any tracked chat-card descendants of a removed wrapper.
 * @param {MutationRecord[]} mutations - The observed childList mutations.
 * @returns {void}
 */
function onNotificationLogMutation(mutations) {
   for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
         const entry = mounts.get(node);
         if (entry) {
            unmountEntry(node, entry);
         }
         else if (node.querySelectorAll) {
            for (const element of node.querySelectorAll('[data-message-id]')) {
               const trackedEntry = mounts.get(element);
               if (trackedEntry) {
                  unmountEntry(element, trackedEntry);
               }
            }
         }
      }
   }
}
