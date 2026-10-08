import { expect } from '@playwright/test';

/**
 * Close every open *transient* Foundry application so sheets, dialogs, HUDs, and tooltips do not leak
 * into the next test on the shared page. Closes both ApplicationV2 instances
 * (`foundry.applications.instances`) and legacy AppV1 windows (`ui.windows`); each close is individually
 * try-caught so one failure does not abort the rest of teardown.
 *
 * Core UI singletons (the persistent layout: `Sidebar`, `ChatLog`, `Hotbar`, `Players`, directories,
 * the `titanEffects` tray, etc.) are deliberately KEPT open. They are registered in `CONFIG.ui` and held
 * live on the `ui` namespace; closing them tears down DOM that the sidebar tab-switch lifecycle depends
 * on (e.g. `Sidebar.changeTab` → `ChatLog._toggleNotifications` → the `#hotbar` element), which would
 * crash any later test that activates a sidebar tab on the shared page.
 *
 * Nested sub-applications OWNED by a kept singleton are kept too. The v14 `PlaceableDirectory`
 * (`ui.placeables`) caches a per-type `PlaceableTab` app (e.g. `TokenTab`) constructed with
 * `{ directory: ui.placeables }`; closing that nested app detaches the element its owner re-queries on
 * every later render, so each subsequent token create/delete crashes `PlaceableDirectory#_renderTab`
 * with an uncaught `null.replaceWith` TypeError that pollutes a later test's page-error window.
 *
 * The canvas HUD container (`canvas.hud`, element id `hud`) is the same detached-DOM class and is kept
 * as well even though it is not in `CONFIG.ui`: it renders only during canvas draw, and two core
 * consumers re-query its DOM with no null guard and no re-render path —
 * `BasePlaceableHUD#_insertElement` appends into `document.getElementById('hud')`, and `ChatBubbles`
 * appends into its `#chat-bubbles` child — so closing it crashes the first later test that opens a
 * token HUD or emits a chat bubble.
 * @param {import('@playwright/test').Page} page - The shared page to clean.
 * @returns {Promise<void>} Resolves once every open transient application has been asked to close.
 */
export async function closeAllApps(page) {
   await page.evaluate(async () => {
      // The set of persistent core UI singletons to keep, resolved from CONFIG.ui's registered slots.
      const coreUi = new Set();
      for (const key of Object.keys(CONFIG.ui ?? {})) {
         const instance = globalThis.ui?.[key];
         if (instance) {
            coreUi.add(instance);
         }
      }

      // Also keep the canvas HUD container: placeable HUDs and chat bubbles re-query its DOM with no
      // null guard, and nothing re-renders it before the next canvas draw. Guarded so a missing canvas
      // never adds `undefined` to the keep-set (which would match every directory-less app below).
      const hudContainer = globalThis.canvas?.hud;
      if (hudContainer) {
         coreUi.add(hudContainer);
      }

      // Close ApplicationV2 instances (the modern app registry), skipping the core UI singletons and
      // any nested sub-application a kept singleton still owns through its `options.directory` link.
      const appV2 = [...(foundry.applications.instances?.values?.() ?? [])];
      for (const app of appV2) {
         if (coreUi.has(app) || coreUi.has(app.options?.directory)) {
            continue;
         }
         try {
            // `animate: false` skips the close transition, which core awaits for up to 1000 ms per window
            // (`client/applications/api/application.mjs:982`, 14.364).
            await app.close({ animate: false });
         }
         catch (error) {
            // Ignore: a mid-teardown close failure must not abort the rest of cleanup.
         }
      }

      // Close legacy AppV1 windows (the deprecated registry still used by a few core dialogs).
      const appV1 = Object.values(globalThis.ui?.windows ?? {});
      for (const app of appV1) {
         try {
            // `animate: false` skips the 200 ms slide-up of the window (`client/appv1/api/application-v1.mjs:850-858`,
            // 14.364).
            await app.close({ animate: false });
         }
         catch (error) {
            // Ignore: see above.
         }
      }
   });
}

/**
 * Delete every chat message in the world. Keeps renders cheap, keeps assertions deterministic, and keeps
 * the world lean so GM-to-player socket replication does not exceed test timeouts. Targeted to chat only;
 * does NOT touch actors or items (specs use find-or-create fixtures).
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>} Resolves once all chat messages are deleted.
 */
export async function clearChat(page) {
   await page.evaluate(async () => {
      const ids = globalThis.game.messages.map((message) => message.id);
      if (ids.length > 0) {
         await globalThis.ChatMessage.deleteDocuments(ids);
      }
   });
}

/** @type {WeakMap<import('@playwright/test').Page, string[][]>} The error collectors attached to each page. */
const PAGE_ERROR_COLLECTORS = new WeakMap();

/** @type {WeakMap<import('@playwright/test').Page, Map<string, number>>} Hook errors delivered per page document. */
const HOOK_ERROR_DELIVERIES = new WeakMap();

/**
 * Installs hook-error reporting on a page before its first navigation (`join.js` `joinWorld` calls it). Core
 * catches a hook listener's throw in `Hooks.#call` and passes it to `Hooks.onError`, which calls the `error` hook only
 * when the thrown value is an `Error` (`Error.isError`); a thrown non-`Error` value is logged as a console warning by
 * `Hooks.#call` and reported nowhere, so it is not collected. Neither reaches `pageerror` (Foundry 14.364,
 * `client/helpers/hooks.mjs:158-168, 182-188`). An init script, run on every document load, registers an `error` hook
 * listener the moment core assigns the `Hooks` global (`client/client.mjs` assigns it with `Object.assign(globalThis,
 * …)`, which calls a setter), so no hook fires before it. Each report is pushed, as `Hooks.onError (<location>):
 * <message>`, to every collector `attachPageErrors` attached to the page, and counted in the document
 * (`globalThis.titanHookErrorState`) so `flushHookErrorReports` can wait for the asynchronous binding to deliver it.
 * @param {import('@playwright/test').Page} page - A page that has not navigated yet.
 * @returns {Promise<void>} Resolves once the binding and the init script are registered.
 */
export async function installHookErrorReporting(page) {
   if (HOOK_ERROR_DELIVERIES.has(page)) {
      return;
   }

   /** @type {Map<string, number>} The reports delivered from each of the page's documents, keyed by document token. */
   const deliveries = new Map();
   HOOK_ERROR_DELIVERIES.set(page, deliveries);
   await page.exposeBinding('titanReportHookError', (source, token, message) => {
      deliveries.set(token, (deliveries.get(token) ?? 0) + 1);
      for (const errors of PAGE_ERROR_COLLECTORS.get(page) ?? []) {
         errors.push(message);
      }
   });
   await page.addInitScript(() => {
      /** @type {object | undefined} The core `Hooks` class, once assigned. */
      let hooks;

      /** @type {{token: string, count: number}} This document's token and how many hook errors it reported. */
      const state = {
         token: `${Date.now()}-${Math.random()}`,
         count: 0,
      };
      Object.defineProperty(globalThis, 'titanHookErrorState', {
         value: state,
      });
      Object.defineProperty(globalThis, 'Hooks', {
         configurable: true,
         enumerable: true,
         get: () => hooks,
         set: (value) => {
            hooks = value;
            value.on('error', (location, error) => {
               state.count++;
               void globalThis.titanReportHookError(state.token, `Hooks.onError (${location}): ${error?.message}`);
            });
         },
      });
   });
}

/**
 * Waits until every hook error the page's current document reported has reached the page's collectors. The binding
 * delivers each report asynchronously, so a collector read right after a hook call could miss it; the document counts
 * its reports synchronously, and this waits for the delivered count to match.
 * @param {import('@playwright/test').Page} page - A page with hook-error reporting installed.
 * @returns {Promise<void>} Resolves once the collectors hold every report of the current document.
 */
export async function flushHookErrorReports(page) {
   /** @type {{token: string, count: number}} The current document's token and report count. */
   const { token, count } = await page.evaluate(() => ({ ...globalThis.titanHookErrorState }));
   await expect.poll(() => HOOK_ERROR_DELIVERIES.get(page).get(token) ?? 0, {
      message: 'every hook error the page reported reached its collectors',
      timeout: 1000,
   }).toBe(count);
}

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire this ONCE in
 * the spec's `beforeAll`; clear it each `afterEach` (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` listeners, which
 * would otherwise stack on a reused page. The array also receives every `Error` core reports through
 * `Hooks.onError` on the page from then on (`installHookErrorReporting`, which `login` installs). The harness gate in
 * `harness.js` already fails any test during which a logged-in page collects an error; a spec collector adds an
 * assertion at a chosen point, on a chosen page.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {string[]} The live array of collected uncaught-error and hook-error messages.
 */
export function attachPageErrors(page) {
   /** @type {string[]} The collected uncaught page-error and hook-error messages. */
   const errors = [];
   page.on('pageerror', (error) => {
      errors.push(error.message);
   });
   PAGE_ERROR_COLLECTORS.set(page, [
      ...PAGE_ERROR_COLLECTORS.get(page) ?? [],
      errors,
   ]);
   return errors;
}

/**
 * Reads the newest chat message's subtype once a message beyond the given count exists. Returns
 * undefined while no new message has landed so `expect.poll` keeps retrying.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {number} before - The world message count snapshotted before the UI trigger.
 * @returns {Promise<string|undefined>} The newest message's subtype, or undefined when none landed.
 */
export function newestMessageType(page, before) {
   return page.evaluate((count) => {
      if (game.messages.size <= count) {
         return undefined;
      }
      return game.messages.contents[game.messages.size - 1]?.type;
   }, before);
}

/**
 * Waits for every running transition and animation under a subtree to finish, so geometry read
 * afterwards is the settled layout rather than an arbitrary mid-animation frame. Event-driven: each
 * animation's `finished` promise resolves on its own finish event, so this returns the moment the
 * subtree settles and never samples on a timer.
 *
 * Infinite animations are excluded (they never finish, and never move the layout to a final state).
 * A cancelled animation rejects its `finished` promise — a replaced or interrupted transition is
 * settled for layout purposes, so a rejection resolves rather than failing the caller.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @param {string} selector - CSS selector for the subtree root to settle.
 * @returns {Promise<void>} Resolves once no finite animation under the root is still running.
 */
export async function waitForAnimations(page, selector) {
   await page.evaluate(async (rootSelector) => {
      /** @type {Element | null} The subtree root whose animations must settle. */
      const root = document.querySelector(rootSelector);
      if (!root) {
         throw new Error(`waitForAnimations: no element matches ${rootSelector}`);
      }

      /** @type {Animation[]} The finite animations currently running under the root. */
      const running = root.getAnimations({ subtree: true })
         .filter((animation) => animation.effect?.getTiming().iterations !== Infinity);

      await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
   }, selector);
}

/**
 * Expands the sidebar and activates the chat tab so the persistent chat log is on screen.
 *
 * The e2e client starts with the sidebar COLLAPSED, which parks `#chat` at x=1920 in a 1920-wide
 * viewport — fully outside it. An off-screen card still satisfies text and visibility assertions
 * (its bounding box is non-empty), but a click on one fails with "element is outside of the
 * viewport". Any spec that interacts with a card in `#chat` must call this first.
 *
 * Prefer `#chat` over the `#chat-notifications` toast as the assertion target: the toast is a
 * transient copy of the same message that animates in over ~500ms and removes itself from the DOM
 * about 5.25s after posting, so tests that drive it race its lifetime.
 * @param {import('@playwright/test').Page} page - The Playwright page bound to the live world.
 * @returns {Promise<void>} Resolves once the chat log is within the viewport.
 */
export async function showChatLog(page) {
   await page.evaluate(async () => {
      ui.sidebar.expand();
      ui.sidebar.changeTab('chat', 'primary');

      // The expand runs a transition; wait for the log's own edge to land inside the viewport.
      await titanWait(
         () => {
            const box = document.querySelector('#chat')?.getBoundingClientRect();
            return !!box && box.right <= window.innerWidth;
         },
         { message: 'chat log within the viewport' },
      );
   });
}

/**
 * Asserts that the page's GM is the active GM, the one client that migrates: `game.users.activeGM` is the designated
 * active GM, the one with the highest role (Foundry v14 `client/documents/collections/users.mjs`
 * `getDesignatedUser`).
 * @param {import('@playwright/test').Page} page - The logged-in page.
 * @returns {Promise<void>} Resolves once asserted.
 */
export async function expectActiveGM(page) {
   expect(await page.evaluate(() => game.users.activeGM?.isSelf), 'the spec GM is the active GM').toBe(true);
}

/**
 * Reloads the world as the same user and waits until a readiness predicate holds on the reloaded page. A world boot is
 * an inherently multi-second wait: the URL check fails a lost session within 15 s, and the boot gets 60 s.
 * @param {import('@playwright/test').Page} page - The logged-in page.
 * @param {object} [options] - How the reload decides the world is ready.
 * @param {() => boolean} [options.ready] - The in-page predicate that marks the world ready; `game.ready` by default.
 * @returns {Promise<void>} Resolves once the predicate holds.
 */
export async function reloadWorld(page, { ready = () => globalThis.game?.ready === true } = {}) {
   await page.reload();
   await page.waitForURL('**/game', { timeout: 15_000 });
   await page.waitForFunction(ready, null, { timeout: 60_000 });
}
