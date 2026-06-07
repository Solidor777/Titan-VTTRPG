# Chat-Message Mount Keying + Clone-Then-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Key chat-card Svelte mounts per rendered element (fixing the notification-pane/popout double-render blank
card and the orphaned-mount hook leak, TODO #10) and refactor the three check chat components to clone-then-update
(TODO #11).

**Architecture:** A new module-level mount registry (`Map<HTMLElement, entry>`) replaces the single
`_svelteComponent` slot on `TitanChatMessage`; stale mounts are reaped by sweeps on every render (entry +
post-render rAF), a `MutationObserver` on the notification pane, and a per-message teardown on delete. The three
mutating components switch to the `system.toObject()` → mutate clone → `update()` pattern already used by
`OnGetChatLogEntryContext.js`.

**Tech Stack:** Foundry v14 `ChatMessage#renderHTML`, Svelte 5 `mount`/`unmount`, Vitest (happy-dom) units,
Playwright e2e on the shared-world harness.

**Spec:** `docs/superpowers/specs/2026-06-06-chat-mount-keying-and-clone-update-design.md`

## Buddy-check directives

No tasks are flagged for a buddy check. High-risk signals were assessed at plan handoff (2026-06-06): no data
destruction, no migration, behavior-preserving refactor + new lifecycle code fully gated by unit/e2e suites. A
buddy check was offered to the human at handoff and declined (execution approved without one). Standing rule for
all tasks: standard two-stage review (spec compliance, then code quality).

---

## Verified facts the implementer must NOT re-derive

- One message renders into up to THREE elements, each via its own `message.renderHTML()` call: main chat log
  (`ChatLog#postOne`), notification pane (`#postNotification`, only when
  `core.uiConfig.chatNotifications === 'cards'` AND the chat tab is not visible), popout (`ui.chat.popout`, a
  second `ChatLog`). `#updateMessage` re-renders every surface holding the message.
- Element-removal paths with NO hook: `#dismissNotification` → `element.remove()`; `#rerenderMessage` →
  `existing.replaceWith(replacement)` (the replacement is rendered BEFORE the old element is removed). Message
  delete fires `preDeleteChatMessage` on the INITIATING client only, BEFORE confirmation; `deleteChatMessage`
  fires on ALL clients for confirmed deletions (verified `client-backend.mjs`) — the teardown hook is therefore
  registered on `deleteChatMessage` (user-approved spec amendment, Task 2 review).
- `ChatLog##doRenderBatch` renders an entire batch (awaiting each message) BEFORE inserting ANY element — a sweep
  may run while batch mounts are registered but not yet connected. Hence the registry's `seen` guard.
- `#chat-notifications` is created ONCE per session (`ChatLog._onFirstRender` → `#renderNotifications`) and
  appended to `#ui-right-column-1`, OUTSIDE the sidebar; its notification list is `#chat-notifications .chat-log`.
  The dismiss control inside a notification card is `[data-action="dismissMessage"]` (`templates/sidebar/
  chat-message.hbs`).
- `ReactiveDocument.destroy()` is a no-op; `createSubscriber` registers its 7 hooks (1 `updateChatMessage` + 6
  embedded-CRUD) while a mounted reader exists and self-cleans on `unmount()`. Therefore
  `Hooks.events.updateChatMessage?.length` (public API, `Hooks.events` static getter) counts live chat-card
  mounts — the e2e leak probe.
- Roll-time auto-expertise (`Check#evaluateCheck` → `_applyExpertise`): raises dice below difficulty up to
  difficulty, cheapest first, leaving the remainder unspent. `expertiseMod` is honored by every dialog-bypassing
  `roll*Check` API when supplied.
- Unit env: Vitest + happy-dom + `tests/setup.js` (fresh `Hooks` mock per test); `~/` alias works in tests;
  partial `vi.mock('svelte', …)` is safe (only `unmount` is replaced).
- e2e harness: shared page per file (`beforeAll` → `login` + `clearChat`; `afterEach` → `closeAllApps` + clear
  errors), `titanWait` poll helper installed by `login`, `forceDice`/`resetDice` from `tests/e2e/dice.js`,
  builders from `tests/shared/builders.js`. NEVER `npm run build` during an e2e run. The e2e world at `:30000`
  must be launched by the USER before any e2e step.
- Sidebar tab switch: `ui.sidebar.changeTab('<tab>', 'primary')`. Popout: `ui.chat.renderPopout()`;
  `ui.chat.popout` is a WeakRef-derefed `ChatLog`; its app element id is `chat-popout`.
- `git add` explicit paths ONLY — never stage `packs/`, `.claude/settings.local.json`,
  `.claude/scheduled_tasks.lock`.

## File structure

| File | Action | Responsibility |
| --- | --- | --- |
| `src/document/types/chat-message/ChatMessageMountRegistry.js` | Create | Element-keyed mount tracking, sweeps, notification observer |
| `src/document/types/chat-message/ChatMessage.js` | Modify | Use the registry; delete the single slot |
| `src/hooks/OnDeleteChatMessage.js` | Create (replaces `OnPreDeleteChatMessage.js`, deleted) | Per-message registry teardown on `deleteChatMessage` |
| `src/check/chat-message/CheckChatMessageDice.svelte` | Modify | Pass `idx` to each die |
| `src/check/chat-message/CheckChatMessageDie.svelte` | Modify | Clone-then-update `applyExpertise` |
| `src/check/chat-message/CheckChatResetExpertiseButton.svelte` | Modify | Clone-then-update `resetExpertise` |
| `src/check/types/casting-check/chat-message/CastingCheckChatMessageScalingAspect.svelte` | Modify | Clone-then-update handlers |
| `tests/unit/ChatMessageMountRegistry.test.js` | Create | Registry semantics |
| `tests/e2e/chat-message-mounts.spec.js` | Create | Notification-pane + popout surfaces, leak probe |
| `tests/e2e/checks-integration.spec.js` | Modify | #11 interaction characterization tests |
| `docs/TODO.md`, `.claude/skills/titan-codebase/references/*` | Modify | Closeout |

---

### Task 1: Mount registry module (TDD)

**Files:**
- Create: `tests/unit/ChatMessageMountRegistry.test.js`
- Create: `src/document/types/chat-message/ChatMessageMountRegistry.js`

- [ ] **Step 1: Write the failing unit tests**

Create `tests/unit/ChatMessageMountRegistry.test.js`:

```js
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test ChatMessageMountRegistry`
Expected: FAIL — cannot resolve `~/document/types/chat-message/ChatMessageMountRegistry.js`.

- [ ] **Step 3: Implement the registry**

Create `src/document/types/chat-message/ChatMessageMountRegistry.js`:

```js
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
 * element, and lazily (re)attaches the notification-pane removal observer.
 * @param {HTMLElement} element - The rendered chat-card root element (the chat-log `li`).
 * @param {string} messageId - The id of the chat message the mount renders.
 * @param {object} handle - The Svelte mount handle returned by `mount()`.
 * @returns {void}
 */
export function registerMount(element, messageId, handle) {
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test ChatMessageMountRegistry`
Expected: PASS (7 tests). If the two observer tests time out, happy-dom's MutationObserver delivery is the
suspect — check `vi.waitFor` default timeout first, then consult the team; do NOT replace the observer tests with
sleeps.

- [ ] **Step 5: Run the full unit suite to verify no regressions**

Run: `npm test`
Expected: all suites pass (212 existing + 7 new).

- [ ] **Step 6: Commit**

```bash
git add src/document/types/chat-message/ChatMessageMountRegistry.js tests/unit/ChatMessageMountRegistry.test.js
git commit -m "feat: element-keyed chat-card mount registry with sweeps + notification observer"
```

---

### Task 2: Rewire `TitanChatMessage.renderHTML` and the preDelete hook

**Files:**
- Modify: `src/document/types/chat-message/ChatMessage.js`
- Modify: `src/hooks/OnPreDeleteChatMessage.js`

- [ ] **Step 1: Replace the single-slot pattern in `ChatMessage.js`**

Replace the entire file content with:

```js
import { mount } from 'svelte';
import ReactiveDocument from '~/document/reactive/ReactiveDocument.svelte.js';
import ChatMessageContent from '~/document/types/chat-message/ChatMessageContent.svelte';
import TitanChatMessageDataModel from '~/document/types/chat-message/ChatMessageDataModel.js';
import darkModeChatMessages from '~/helpers/Settings/DarkModeChatMessages.js';
import {
   registerMount,
   sweepStaleMounts,
} from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/**
 * Extends the base Chat Message class so TITAN chat message subtypes render their own Svelte
 * component. Subtyped messages reuse Foundry's standard card chrome (via super.renderHTML) and mount
 * a Svelte component into the card's content region; all other messages render unchanged apart from
 * the dark-mode-'all' styling class. One message renders into up to THREE elements (main chat log,
 * notification pane, chat popout), each through its own renderHTML call; every mount is tracked
 * per element in the chat-message mount registry.
 * @extends {ChatMessage}
 */
export default class TitanChatMessage extends ChatMessage {
   /**
    * Renders the chat message HTML. For TITAN subtypes, mounts the subtype's Svelte component into
    * the standard card content region and tracks it per rendered element.
    * @override
    * @param {object} [options] - Options forwarded to the base renderer.
    * @returns {Promise<HTMLElement>} The rendered chat message element.
    */
   async renderHTML(options) {
      // Reap tracked mounts whose elements have left the DOM (closed popouts, sidebar re-renders).
      sweepStaleMounts();

      // Build Foundry's standard card chrome (header, content region, controls).
      const html = await super.renderHTML(options);

      // Non-TITAN messages render unchanged, except dark mode applies to every message when the
      // setting is 'all' (previously handled by the deleted legacy renderChatMessageHTML hook).
      if (!(this.system instanceof TitanChatMessageDataModel)) {
         if (darkModeChatMessages() === 'all') {
            html.classList.add('titan-dark-mode');
         }
         return html;
      }

      // Apply TITAN styling classes.
      html.classList.add('titan');
      if (this.isOwner) {
         html.classList.add('owner');
      }
      if (darkModeChatMessages() !== 'disabled') {
         html.classList.add('titan-dark-mode');
      }

      // Mount the subtype's Svelte component into the card content region and track it per element.
      // The ReactiveDocument bridge needs no explicit teardown: its createSubscriber hooks self-clean
      // when the component unmounts.
      const bridge = new ReactiveDocument(this);
      const handle = mount(ChatMessageContent, {
         target: html.querySelector('.message-content'),
         props: {
            documentStore: bridge,
         },
      });
      registerMount(html, this.id, handle);

      // Foundry replaces a re-rendered card's predecessor element AFTER this render returns
      // (ChatLog##rerenderMessage → replaceWith); sweep again once the DOM settles so the
      // predecessor's mount is reaped in the same frame.
      requestAnimationFrame(() => sweepStaleMounts());

      return html;
   }
}
```

Deleted relative to the previous version: the `_svelteComponent` field, the pre-mount
`this._teardownComponent()` call, the `_teardownComponent()` method, and the `unmount` import.

- [ ] **Step 2: Rewire `OnPreDeleteChatMessage.js`**

Replace the entire file content with:

```js
import { teardownMessageMounts } from '~/document/types/chat-message/ChatMessageMountRegistry.js';

/**
 * Tears down all of a TITAN chat message's mounted Svelte components (main log, notification pane,
 * popout) when the message is deleted.
 * @param {ChatMessage} message - The Chat Message being deleted.
 */
export default function onPreDeleteChatMessage(message) {
   if (message?.id) {
      teardownMessageMounts(message.id);
   }
}
```

- [ ] **Step 3: Verify nothing else references the deleted members**

Run: `grep -rn "_svelteComponent\|_teardownComponent" src/`
Expected: no matches.

- [ ] **Step 4: Build and run the unit suite**

Run: `npm run build` then `npm test`
Expected: build clean; all unit suites pass.

- [ ] **Step 5: Smoke the chat render path in e2e (world must be launched by the user)**

Confirm with the user that the e2e world at `:30000` is running. NEVER build while e2e runs.

Run: `npm run test:e2e -- tests/e2e/report-cards.spec.js tests/e2e/item-cards.spec.js`
Expected: all tests in both files pass (these render many TITAN subtypes through the new registry path).

- [ ] **Step 6: Commit**

```bash
git add src/document/types/chat-message/ChatMessage.js src/hooks/OnPreDeleteChatMessage.js
git commit -m "fix: key chat-card Svelte mounts per rendered element (TODO #10)"
```

---

### Task 3: e2e — notification pane + popout surfaces and the leak probe

**Files:**
- Create: `tests/e2e/chat-message-mounts.spec.js`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/chat-message-mounts.spec.js`:

```js
import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Chat-message mount keying (TODO #10): one message renders into up to three elements (main chat
 * log, notification pane, chat popout); each element carries its OWN tracked Svelte mount, and every
 * removal path tears its mount down. Leak probe: each mounted card's ReactiveDocument bridge holds
 * exactly one `updateChatMessage` hook registration while mounted, so
 * `Hooks.events.updateChatMessage?.length` deltas count live mounts (public Foundry API).
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Reads the current number of registered `updateChatMessage` hook handlers (the live-mount probe).
 * @returns {Promise<number>} The registration count.
 */
function hookCount() {
   return page.evaluate(() => Hooks.events.updateChatMessage?.length ?? 0);
}

/**
 * Counts the rendered children of a message's `.message-content` region under a root selector.
 * Pre-fix, a surface blanked by the single-slot collision reports 0.
 * @param {string} rootSelector - Selector for the containing log root (e.g. '#chat').
 * @param {string} messageId - The message id to look up.
 * @returns {Promise<number>} The content child count (0 when the card or content region is absent).
 */
function contentChildCount(rootSelector, messageId) {
   return page.evaluate(({ rootSelector, messageId }) => {
      /** @type {HTMLElement | null} The card content region for the message under the root. */
      const content = document.querySelector(
         `${rootSelector} li[data-message-id="${messageId}"] .message-content`,
      );
      return content?.children.length ?? 0;
   }, { rootSelector, messageId });
}

/**
 * Rebuilds the mount-roller fixture actor and rolls a dialog-bypassing attribute check, returning
 * the created message's id.
 * @returns {Promise<string>} The created check message's id.
 */
async function rollCheckMessage() {
   return page.evaluate(async () => {
      const stale = game.actors.getName('E2E Mount Roller');
      if (stale) {
         await stale.delete();
      }
      const actor = await Actor.create({ name: 'E2E Mount Roller', type: 'player' });
      const before = game.messages.size;
      await actor.system.rollAttributeCheck({ attribute: 'body' });
      await globalThis.titanWait(() => game.messages.size > before, { message: 'check message created' });
      return game.messages.contents.at(-1).id;
   });
}

test.describe('chat-message mount keying', () => {
   test('notification pane and main log each hold a live mount through update, dismissal, delete', async () => {
      // Force card notifications and park the sidebar on a non-chat tab so notifications post.
      await page.evaluate(async () => {
         globalThis.__e2ePriorUiConfig = game.settings.get('core', 'uiConfig');
         await game.settings.set('core', 'uiConfig', {
            ...globalThis.__e2ePriorUiConfig,
            chatNotifications: 'cards',
         });
         ui.sidebar.changeTab('actors', 'primary');
      });

      try {
         const baseline = await hookCount();
         const messageId = await rollCheckMessage();

         // Both surfaces hold mounted content (pre-fix the MAIN LOG card is blank: the notification
         // render's teardown unmounted it).
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
            .toBeGreaterThan(0);
         await expect
            .poll(() => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card has content' })
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

         // An update re-renders both surfaces without blanking either or leaking mounts.
         await page.evaluate(async (id) => {
            await game.messages.get(id).update({ 'flags.titan.e2eTouch': 1 });
         }, messageId);
         await expect
            .poll(() => contentChildCount('#chat', messageId), { message: 'main log card after update' })
            .toBeGreaterThan(0);
         await expect
            .poll(() => contentChildCount('#chat-notifications', messageId),
               { message: 'notification card after update' })
            .toBeGreaterThan(0);
         await expect.poll(hookCount, { message: 'still two live mounts after update' }).toBe(baseline + 2);

         // Dismissing the notification removes its element with no render; the observer unmounts it.
         await page.evaluate((id) => {
            document.querySelector(
               `#chat-notifications li[data-message-id="${id}"] [data-action="dismissMessage"]`,
            ).click();
         }, messageId);
         await expect.poll(hookCount, { message: 'notification mount torn down' }).toBe(baseline + 1);

         // Deleting the message tears the remaining mount down via deleteChatMessage.
         await page.evaluate(async (id) => {
            await game.messages.get(id).delete();
         }, messageId);
         await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
         expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
      }
      finally {
         await page.evaluate(async () => {
            await game.settings.set('core', 'uiConfig', globalThis.__e2ePriorUiConfig);
            ui.sidebar.changeTab('chat', 'primary');
         });
      }
   });

   test('popout and main log each hold a live mount; closing the popout reaps via sweep', async () => {
      // Chat tab active: notifications never post; the popout is the second surface.
      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
      });
      await page.evaluate(async () => {
         await ui.chat.renderPopout();
         await globalThis.titanWait(() => ui.chat.popout?.rendered === true, { message: 'chat popout rendered' });
      });

      // Baseline AFTER the popout opens (it re-renders any existing messages into its own log).
      const baseline = await hookCount();
      const messageId = await rollCheckMessage();

      // Both surfaces hold mounted content (pre-fix the MAIN LOG card is blank: the popout render's
      // teardown unmounted it).
      await expect
         .poll(() => contentChildCount('#chat', messageId), { message: 'main log card has content' })
         .toBeGreaterThan(0);
      await expect
         .poll(() => contentChildCount('#chat-popout', messageId), { message: 'popout card has content' })
         .toBeGreaterThan(0);
      await expect.poll(hookCount, { message: 'two live mounts' }).toBe(baseline + 2);

      // Closing the popout removes its DOM; the next render's entry sweep reaps the orphaned mount.
      await page.evaluate(async (id) => {
         await ui.chat.popout.close();
         await game.messages.get(id).update({ 'flags.titan.e2eTouch': 2 });
      }, messageId);
      await expect.poll(hookCount, { message: 'popout mount swept' }).toBe(baseline + 1);

      // Delete restores the baseline.
      await page.evaluate(async (id) => {
         await game.messages.get(id).delete();
      }, messageId);
      await expect.poll(hookCount, { message: 'all mounts torn down' }).toBe(baseline);
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   });
});
```

- [ ] **Step 2: Run the new spec (world must be launched; no concurrent build)**

Run: `npm run test:e2e -- tests/e2e/chat-message-mounts.spec.js`
Expected: 2 tests pass. Likely flake points and their fixes (do NOT add sleeps): dismissal animation takes
~350ms — covered by `expect.poll`; if the dismiss click misses, the control is
`a.message-dismiss[data-action="dismissMessage"]` inside the notification card (in-page `.click()` is used
deliberately because the control is hover-styled).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/chat-message-mounts.spec.js
git commit -m "test: e2e for per-element chat mounts (notification pane + popout, hook-count leak probe)"
```

---

### Task 4: e2e characterization of the #11 interactions (pre-refactor, must pass on CURRENT code)

These tests pin the behavior the Task 5 refactor must preserve. They are written and verified green BEFORE the
refactor.

**Files:**
- Modify: `tests/e2e/checks-integration.spec.js` (append a new describe block at the end of the file)

- [ ] **Step 1: Append the interaction describe block**

Append to `tests/e2e/checks-integration.spec.js` (inside the file, after the existing describe; it reuses the
file's shared `page`, the `E2E Roller` rebuild in the existing `beforeEach`, and `forceDice`/`resetDice`):
[Execution note: hooks were describe-scoped at the time — the review fix hoisted them to file level, which
made this true; see commit b6b0b94a.]

```js
test.describe('check chat-card interactions (clone-then-update parity)', () => {
   /**
    * Reads a plain snapshot of the newest message's check state for delta assertions.
    * @param {string} messageId - The message to read.
    * @returns {Promise<object>} `{ dice: {final, expertiseApplied}[], expertiseRemaining }`.
    */
   function readCheckState(messageId) {
      return page.evaluate((id) => {
         const system = game.messages.get(id).system.toObject();
         return {
            dice: system.results.dice.map((die) => ({
               final: die.final,
               expertiseApplied: die.expertiseApplied,
            })),
            expertiseRemaining: system.results.expertiseRemaining,
         };
      }, messageId);
   }

   test('die click applies expertise; reset restores the roll', async () => {
      // Difficulty 4, expertiseMod 2, forced [3, 1, 1]: roll-time auto-expertise raises the 3 to 4
      // (cheapest first) and leaves 1 expertise remaining with two clickable failure dice.
      await forceDice(page, [3, 1, 1]);
      const messageId = await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const before = game.messages.size;
         await actor.system.rollAttributeCheck({ attribute: 'body', expertiseMod: 2 });
         await globalThis.titanWait(() => game.messages.size > before, { message: 'check message created' });
         return game.messages.contents.at(-1).id;
      });

      // Confirm the roll-time state the click test depends on.
      expect(await readCheckState(messageId)).toEqual({
         dice: [
            { final: 4, expertiseApplied: 1 },
            { final: 1, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 1,
      });

      // Show the chat tab and click the second die (final 1 — clickable while expertise remains).
      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
      });
      const card = page.locator(`#chat .chat-log li[data-message-id="${messageId}"]`);
      await card.locator('.die button').nth(1).click();

      // The update round-trip persists the bumped die and spends the last expertise.
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            { final: 4, expertiseApplied: 1 },
            { final: 2, expertiseApplied: 1 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 0,
      });

      // The card re-renders the die with its expertise label.
      await expect(card.locator('.die').nth(1)).toContainText('1 + 1');

      // Reset restores every die to its base and refunds the full expertise pool.
      await card.locator('button:has(i.fa-rotate-left)').click();
      await expect.poll(() => readCheckState(messageId)).toEqual({
         dice: [
            { final: 3, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
            { final: 1, expertiseApplied: 0 },
         ],
         expertiseRemaining: 2,
      });
   });

   test('scaling aspect increase/decrease/reset adjust the clone-backed results', async () => {
      // Give the roller's spell a scaling damage aspect (in-test only; the shared builders stay
      // untouched so the zero-expertise oracle tests keep their complexity expectations).
      await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const spell = actor.items.find((item) => item.type === 'spell');
         await spell.update({
            system: {
               customAspect: [
                  {
                     label: 'E2E Damage Aspect',
                     scaling: true,
                     initialValue: 1,
                     cost: 1,
                     resistanceCheck: 'none',
                     isDamage: true,
                     isHealing: false,
                     uuid: 'e2e0aaaa-0000-4000-8000-000000000001',
                  },
               ],
            },
         });
      });

      // Force three successes so extra successes are available to spend.
      await forceDice(page, [6, 6, 6]);
      const messageId = await page.evaluate(async () => {
         const actor = game.actors.getName('E2E Roller');
         const spell = actor.items.find((item) => item.type === 'spell');
         const before = game.messages.size;
         await actor.system.rollCastingCheck({ itemId: spell.id });
         await globalThis.titanWait(() => game.messages.size > before, { message: 'casting message created' });
         return game.messages.contents.at(-1).id;
      });

      /**
       * Reads a plain snapshot of the casting message's scaling state.
       * @returns {Promise<object>} `{ currentValue, extraSuccessesRemaining, damage }`.
       */
      const readScalingState = () => page.evaluate((id) => {
         const system = game.messages.get(id).system.toObject();
         return {
            currentValue: system.results.scalingAspect[0].currentValue,
            extraSuccessesRemaining: system.results.extraSuccessesRemaining,
            damage: system.results.damage,
         };
      }, messageId);

      const initial = await readScalingState();
      expect(initial.currentValue, 'aspect starts at its initial value').toBe(1);
      expect(initial.extraSuccessesRemaining, 'extra successes available to spend').toBeGreaterThanOrEqual(1);

      await page.evaluate(() => {
         ui.sidebar.changeTab('chat', 'primary');
      });
      const aspect = page.locator(`#chat .chat-log li[data-message-id="${messageId}"] .aspect`);

      // Increase: +1 value and damage, -cost extra successes. Initially the increase button is the
      // only enabled aspect control (reset/decrease disable at the initial value).
      await aspect.locator('.controls button:enabled').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: initial.currentValue + 1,
         extraSuccessesRemaining: initial.extraSuccessesRemaining - 1,
         damage: initial.damage + 1,
      });
      await expect(aspect.locator('.header .value')).toHaveText(String(initial.currentValue + 1));

      // Decrease (second .control) restores the initial state.
      await aspect.locator('.controls .control:nth-child(3) button').click();
      await expect.poll(readScalingState).toEqual(initial);

      // Increase once more, then reset (first .control) restores the initial state again.
      await aspect.locator('.controls button:enabled').click();
      await expect.poll(readScalingState).toEqual({
         currentValue: initial.currentValue + 1,
         extraSuccessesRemaining: initial.extraSuccessesRemaining - 1,
         damage: initial.damage + 1,
      });
      await aspect.locator('.controls .control:nth-child(2) button').click();
      await expect.poll(readScalingState).toEqual(initial);
   });
});
```

DOM note for the implementer: inside `.aspect .controls`, the children are `.cost` (nth-child 1), then three
`.control` divs — reset (2), decrease (3), increase (4). The first increase click uses `:enabled` because reset
and decrease are disabled at the initial value, making the increase button the only enabled one.

- [ ] **Step 2: Run the file — these tests MUST pass on the CURRENT (pre-refactor) code**

Run: `npm run test:e2e -- tests/e2e/checks-integration.spec.js`
Expected: all existing tests + 2 new tests pass. If a new test fails, the test's expectations are wrong (the
production behavior is the spec here) — fix the test, not the components.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/checks-integration.spec.js
git commit -m "test: characterize check chat-card interactions ahead of clone-then-update refactor"
```

---

### Task 5: Clone-then-update refactor of the three components (TODO #11)

The Task 4 tests pin the behavior; this task must keep them green. The live DataModel is never written; payloads
are built from `document.data.system.toObject()` (a detached source clone — equivalent to prepared data for check
chat DMs, which derive nothing over `parameters`/`results`).

**Files:**
- Modify: `src/check/chat-message/CheckChatMessageDice.svelte`
- Modify: `src/check/chat-message/CheckChatMessageDie.svelte`
- Modify: `src/check/chat-message/CheckChatResetExpertiseButton.svelte`
- Modify: `src/check/types/casting-check/chat-message/CastingCheckChatMessageScalingAspect.svelte`

- [ ] **Step 1: Pass `idx` from `CheckChatMessageDice.svelte`**

Replace the `{#each}` block:

```svelte
{#each dice as die, idx}
   <div class="dice">
      <CheckChatMessageDie
         {die}
         {idx}
      />
   </div>
{/each}
```

- [ ] **Step 2: Refactor `CheckChatMessageDie.svelte`**

Replace the props typedef/declaration and `applyExpertise` (the `$derived` display reads — `label`, `result`,
`disabled`, `dieTooltip` — stay on the live model and are unchanged):

```js
/**
 * @typedef {object} CheckChatMessageDieProps
 * @property {CheckDie} [die] - The individual die being displayed.
 * @property {number} [idx] - Index of the die in the check results' dice array.
 */

/** @type {CheckChatMessageDieProps} */
let {
   die = undefined,
   idx = undefined,
} = $props();
```

```js
/**
 * Applies a point of Expertise to the die. Mutates a detached system clone only — the live
 * DataModel is never written; the update round-trip re-renders the card.
 */
function applyExpertise() {
   // Clone the system data and address this die in the clone.
   const system = document.data.system.toObject();
   const clonedDie = system.results.dice[idx];

   // If expertise can be applied.
   if (system.results.expertiseRemaining > 0 && clonedDie.final < 6) {
      // Add the expertise and decrement it from those remaining.
      clonedDie.final += 1;
      clonedDie.expertiseApplied += 1;
      system.results.expertiseRemaining -= 1;

      // Recalculate the results, passing the message type for type-specific recalculation.
      const results = recalculateCheckResults(
         {
            type: document.data.type,
            parameters: system.parameters,
            results: system.results,
         },
      );

      // Update the document.
      document.data.update({
         system: {
            results: results,
         },
      });
   }
}
```

(`structuredClone` is gone: `toObject()` is already detached and `recalculateCheckResults` returns a fresh
object.)

- [ ] **Step 3: Refactor `CheckChatResetExpertiseButton.svelte`**

Replace `resetExpertise`:

```js
/**
 * Resets all applied Expertise. Mutates a detached system clone only — the live DataModel is never
 * written; the update round-trip re-renders the card.
 */
function resetExpertise() {
   // Clone the system data.
   const system = document.data.system.toObject();

   // Remove the expertise from each die.
   for (const die of system.results.dice) {
      die.final = die.base;
      die.expertiseApplied = 0;
   }

   // Reset the expertise available and recalculate the check results.
   system.results.expertiseRemaining = system.parameters.totalExpertise;
   const results = recalculateCheckResults(
      {
         type: document.data.type,
         parameters: system.parameters,
         results: system.results,
      },
   );

   document.data.update({
      system: {
         results: results,
      },
   });
}
```

- [ ] **Step 4: Refactor `CastingCheckChatMessageScalingAspect.svelte`**

Replace the three handlers (`$derived` display reads — `aspect`, `aspectIncrement`, `icons` — stay on the live
model and are unchanged):

```js
/**
 * Increases the aspect by the increment and updates the total cost. Mutates a detached system clone
 * only — the live DataModel is never written; the update round-trip re-renders the card.
 */
function increaseAspect() {
   // Clone the system data and address this aspect in the clone.
   const system = document.data.system.toObject();
   const clonedAspect = system.results.scalingAspect[idx];

   // Increase the aspect.
   clonedAspect.currentValue += aspectIncrement;

   // Decrease the extra successes by the cost.
   system.results.extraSuccessesRemaining -= clonedAspect.cost;

   // Update damage if appropriate.
   if (clonedAspect.isDamage) {
      system.results.damage += aspectIncrement;
   }

   // Update healing if appropriate.
   if (clonedAspect.isHealing) {
      system.results.healing += aspectIncrement;
   }

   // Update the document.
   document.data.update({
      system: {
         results: system.results,
      },
   });
}

/**
 * Decreases the aspect by the increment and updates the total cost. Mutates a detached system clone
 * only — the live DataModel is never written; the update round-trip re-renders the card.
 */
function decreaseAspect() {
   // Clone the system data and address this aspect in the clone.
   const system = document.data.system.toObject();
   const clonedAspect = system.results.scalingAspect[idx];

   // Decrease the aspect.
   clonedAspect.currentValue -= aspectIncrement;

   // Increase the extra successes by the cost.
   system.results.extraSuccessesRemaining += clonedAspect.cost;

   // Update damage if appropriate.
   if (clonedAspect.isDamage) {
      system.results.damage -= aspectIncrement;
   }

   // Update healing if appropriate.
   if (clonedAspect.isHealing) {
      system.results.healing -= aspectIncrement;
   }

   // Update the document.
   document.data.update({
      system: {
         results: system.results,
      },
   });
}

/**
 * Resets all increases to the aspect and restores the total cost. Mutates a detached system clone
 * only — the live DataModel is never written; the update round-trip re-renders the card.
 */
function resetAspect() {
   // Clone the system data and address this aspect in the clone.
   const system = document.data.system.toObject();
   const clonedAspect = system.results.scalingAspect[idx];

   // Get the aspect delta.
   const delta = clonedAspect.currentValue - clonedAspect.initialValue;
   const incrementCount = delta / aspectIncrement;
   const cost = incrementCount * clonedAspect.cost;

   // Reset the aspect to its original value.
   clonedAspect.currentValue = clonedAspect.initialValue;

   // Reset the extra successes.
   system.results.extraSuccessesRemaining += cost;

   // Update damage if appropriate.
   if (clonedAspect.isDamage) {
      system.results.damage -= delta;
   }

   // Update healing if appropriate.
   if (clonedAspect.isHealing) {
      system.results.healing -= delta;
   }

   document.data.update({
      system: {
         results: system.results,
      },
   });
}
```

- [ ] **Step 5: Verify no live-model mutations remain in chat components**

Run: `grep -rnE "document\.data\.system\.(results|parameters)\.[a-zA-Z.]+ (=|\+=|-=|\*=)" src/`
Expected: no matches.

- [ ] **Step 6: Build, unit, and re-run the characterization + mounts e2e**

Run: `npm run build` then `npm test`
Expected: build clean, all unit suites pass.

Then (world launched, no concurrent build):
Run: `npm run test:e2e -- tests/e2e/checks-integration.spec.js tests/e2e/chat-message-mounts.spec.js`
Expected: all tests pass — the Task 4 characterization tests prove behavior parity.

- [ ] **Step 7: Commit**

```bash
git add src/check/chat-message/CheckChatMessageDice.svelte src/check/chat-message/CheckChatMessageDie.svelte src/check/chat-message/CheckChatResetExpertiseButton.svelte src/check/types/casting-check/chat-message/CastingCheckChatMessageScalingAspect.svelte
git commit -m "refactor: check chat components clone-then-update, never mutate the live DataModel (TODO #11)"
```

---

### Task 6: Documentation closeout

**Files:**
- Modify: `docs/TODO.md` (delete entries #10 and #11 — entire sections including headers; completed entries are
  DELETED, never marked done)
- Modify: `.claude/skills/titan-codebase/references/abstractions.md`
- Modify: `.claude/skills/titan-codebase/references/data-flow.md`
- Modify: `.claude/skills/titan-codebase/references/conventions.md`

- [ ] **Step 1: Delete TODO #10 and #11**

In `docs/TODO.md`, delete the full sections
`### 10. Chat-message Svelte mount is keyed per-document, not per-element` and
`### 11. Check chat components mutate the live DataModel before update()` (header through last body line of
each). Leave every other entry untouched.

- [ ] **Step 2: Update the titan-codebase skill**

Make these edits (concise, current-state phrasing; no changelog narration):

1. `references/abstractions.md` — in the chat-message section, add: `TitanChatMessage` mounts are tracked in
   `ChatMessageMountRegistry.js` (module-level `Map<HTMLElement, {handle, messageId, seen}>`); one message holds
   up to three live mounts (main log, notification pane, popout); teardown paths = render-entry sweep +
   post-render rAF sweep + a `MutationObserver` on `#chat-notifications .chat-log` + `deleteChatMessage` →
   `teardownMessageMounts`. The `seen` flag defers sweeping until an element has been connected once
   (`ChatLog##doRenderBatch` inserts batches after rendering them).
2. `references/data-flow.md` — wherever the chat render flow describes the single `_svelteComponent` slot or
   "the chat log replaces the element on every update", correct it to the per-element registry flow (search for
   `_svelteComponent` and `renderHTML` mentions; rewrite the touched sentences).
3. `references/conventions.md` — add a convention entry: "Chat components never mutate the live DataModel —
   build the payload from `document.data.system.toObject()`, mutate the clone, then `document.data.update(...)`
   (exemplar: `OnGetChatLogEntryContext.js`). Display `$derived`s read the live model; only update handlers
   clone." Also note the e2e leak probe idiom: `Hooks.events.updateChatMessage?.length` deltas count live
   chat-card mounts.

- [ ] **Step 3: Commit**

```bash
git add docs/TODO.md .claude/skills/titan-codebase/references/abstractions.md .claude/skills/titan-codebase/references/data-flow.md .claude/skills/titan-codebase/references/conventions.md
git commit -m "docs: close TODO #10 + #11; record mount registry + clone-then-update convention"
```

---

### Task 7: Full verification

- [ ] **Step 1: Clean build**

Run: `npm run build`
Expected: clean; `dist/` single chunk, no errors.

- [ ] **Step 2: Full unit suite**

Run: `npm test`
Expected: all suites pass (212 pre-existing + 7 registry = 219).

- [ ] **Step 3: Full e2e — three foreground shards, world launched, NO concurrent build**

Confirm with the user that the world at `:30000` is launched. Then run sequentially in the FOREGROUND:

```
npm run test:e2e -- --shard=1/3
npm run test:e2e -- --shard=2/3
npm run test:e2e -- --shard=3/3
```

Expected: 402 pre-existing + 4 new (2 mounts + 2 interactions) = 406 total passing across the shards.

- [ ] **Step 4: Report**

Report exact unit/e2e counts and any deviations to the user before the merge decision (the
superpowers:finishing-a-development-branch skill governs the merge).

---

## Self-review notes (writing-plans checklist, run 2026-06-06)

- **Spec coverage:** §3 registry → Task 1; §4 renderHTML/hook → Task 2; §5 components → Task 5 (idx pass in
  Step 1); §6 error handling → registry per-entry try/catch (Task 1) + observer laziness; §7 unit → Task 1,
  e2e surfaces → Task 3, #11 interactions → Task 4 (coverage gap confirmed: none of die-click/reset/aspect was
  covered; all three added); §8 docs → Task 6; full cycle → Task 7.
- **Type consistency:** `registerMount(element, messageId, handle)` / `sweepStaleMounts()` /
  `teardownMessageMounts(messageId)` used identically in Tasks 1, 2; `idx` prop name matches the existing
  `CastingCheckChatMessageScalingAspect` convention.
- **Order-of-execution note:** Task 4 (characterization) intentionally precedes Task 5 (refactor) so the
  interaction tests gate parity. Tasks 1→2→3 must run in order; Task 4 may run any time before Task 5.
