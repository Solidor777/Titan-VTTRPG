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
            await app.close();
         }
         catch (error) {
            // Ignore: a mid-teardown close failure must not abort the rest of cleanup.
         }
      }

      // Close legacy AppV1 windows (the deprecated registry still used by a few core dialogs).
      const appV1 = Object.values(globalThis.ui?.windows ?? {});
      for (const app of appV1) {
         try {
            await app.close();
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

/** @type {WeakSet<import('@playwright/test').Page>} The pages whose hook-error reporting is installed. */
const HOOK_ERROR_PAGES = new WeakSet();

/**
 * Installs hook-error reporting on a page before its first navigation (`login` calls it). Core catches a hook
 * listener's throw in `Hooks.#call` and reports it through `Hooks.onError`, which logs it and calls the `error` hook;
 * it never reaches `pageerror` (Foundry 14.364, `client/helpers/hooks.mjs:158-168, 182-188`). An init script, run on
 * every document load, registers an `error` hook listener the moment core assigns the `Hooks` global
 * (`client/client.mjs` assigns it with `Object.assign(globalThis, …)`, which calls a setter), so no hook fires before
 * it. Each reported error is pushed to every collector `attachPageErrors` attached to the page, and to the
 * document's own list `globalThis.titanHookErrorReports`, which `readHookErrorReports` returns; that list keeps the
 * reports made before any collector was attached (`login` asserts it is empty once the world is ready). Only errors
 * reported through `Hooks.onError` are collected, never other console output.
 * @param {import('@playwright/test').Page} page - A page that has not navigated yet.
 * @returns {Promise<void>} Resolves once the binding and the init script are registered.
 */
export async function installHookErrorReporting(page) {
   if (HOOK_ERROR_PAGES.has(page)) {
      return;
   }
   HOOK_ERROR_PAGES.add(page);
   await page.exposeBinding('titanReportHookError', (source, message) => {
      for (const errors of PAGE_ERROR_COLLECTORS.get(page) ?? []) {
         errors.push(message);
      }
   });
   await page.addInitScript(() => {
      /** @type {object | undefined} The core `Hooks` class, once assigned. */
      let hooks;

      /** @type {string[]} Every hook error reported in this document, in order. */
      const reports = [];
      Object.defineProperty(globalThis, 'titanHookErrorReports', {
         value: reports,
      });
      Object.defineProperty(globalThis, 'Hooks', {
         configurable: true,
         enumerable: true,
         get: () => hooks,
         set: (value) => {
            hooks = value;
            value.on('error', (location, error) => {
               /** @type {string} The reported error, prefixed with where core caught it. */
               const message = `Hooks.onError (${location}): ${error?.message}`;
               reports.push(message);
               void globalThis.titanReportHookError(message);
            });
         },
      });
   });
}

/**
 * Reads every hook error reported in the page's current document, including those reported before any
 * `attachPageErrors` collector was attached. The list is filled synchronously inside the page, so a read that follows a
 * hook call sees its report, unlike the asynchronous binding that feeds the collectors.
 * @param {import('@playwright/test').Page} page - A page with hook-error reporting installed.
 * @returns {Promise<string[]>} The reported errors, in order.
 */
export async function readHookErrorReports(page) {
   return page.evaluate(() => [...globalThis.titanHookErrorReports]);
}

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire this ONCE in
 * the spec's `beforeAll`; clear it each `afterEach` (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` listeners, which
 * would otherwise stack on a reused page. The array also receives every error core reports through
 * `Hooks.onError` on the page from then on (`installHookErrorReporting`, which `login` installs).
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
 * Builds a COMPLETE item/effect check entry mirroring createItemCheckTemplate()
 * (src/check/types/item-check/ItemCheckTemplate.js). Node-side data factory: build the object here
 * and pass it INTO page.evaluate as data (the template module is not importable in the browser
 * context, and omitting fields like opposedCheck makes getItemCheckParameters throw).
 * @param {string} label - The check's display label (rendered on its ItemCheckButton).
 * @param {string} uuid - A unique id for the check entry.
 * @param {object} [overrides] - Field overrides merged over the complete default entry.
 * @returns {object} The complete check entry.
 */
export function buildCheck(label, uuid, overrides = {}) {
   return {
      attribute: 'body',
      complexity: 1,
      damageReducedBy: 'none',
      difficulty: 4,
      initialValue: 1,
      isDamage: false,
      isHealing: false,
      label: label,
      opposedCheck: {
         attribute: 'mind',
         enabled: true,
         skill: 'perception',
      },
      resistanceCheck: 'reflexes',
      resolveCost: 2,
      scaling: true,
      skill: 'arcana',
      uuid: uuid,
      ...overrides,
   };
}

/**
 * Deletes a fixture actor by name (when present) along with any token it left on the active scene
 * (deleting an actor does NOT delete its placed tokens). Serves both the stale sweep at seed time
 * and final afterAll cleanup.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {string} actorName - The name of the fixture actor to remove.
 * @returns {Promise<void>} Resolves once the actor and its tokens are removed from the world.
 */
export async function deleteFixtureActor(page, actorName) {
   await page.evaluate(async (name) => {
      const actor = game.actors.getName(name);
      if (!actor) {
         return;
      }

      // Remove the actor's tokens from the active scene before deleting the actor itself.
      const scene = game.scenes.active;
      if (scene) {
         const tokenIds = scene.tokens
            .filter((token) => token.actorId === actor.id)
            .map((token) => token.id);
         if (tokenIds.length > 0) {
            await scene.deleteEmbeddedDocuments('Token', tokenIds);
         }
      }
      await actor.delete();
   }, actorName);
}

/**
 * Deletes every token on every scene whose actor no longer resolves — the orphans left behind by
 * prior runs whose fixtures deleted the actor without deleting its placed tokens. Call once per
 * spec file (beforeAll, after login) in any spec that places fixture tokens.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {Promise<void>} Resolves once all orphaned tokens are deleted.
 */
export async function deleteOrphanedTokens(page) {
   await page.evaluate(async () => {
      for (const scene of game.scenes) {
         const orphanIds = scene.tokens
            .filter((token) => !token.actorId || !game.actors.get(token.actorId))
            .map((token) => token.id);
         if (orphanIds.length > 0) {
            await scene.deleteEmbeddedDocuments('Token', orphanIds);
         }
      }
   });
}

/**
 * Places a token for the named actor on the active scene (creating a fallback scene when none is
 * active) once the canvas has finished drawing that scene, waits until the placeable is DRAWN (throwing
 * with a clear message on exhaustion — a never-drawn placeable must fail here, not at a later,
 * less-diagnostic timeout), controls it, and refreshes the Effect HUD and Player HUD so the GM resolution
 * ladders resolve the actor.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {object} options - Selects the fixture token and how it is controlled.
 * @param {string} options.actorName - The fixture actor's name (must already exist).
 * @param {string} options.fallbackSceneName - Name for the fallback scene if none is active.
 * @param {boolean} [options.releaseOthers] - Whether controlling the token releases other tokens.
 * @returns {Promise<string|null>} The created fallback scene's id for afterAll cleanup, or null.
 */
export async function controlFixtureActorToken(page, { actorName, fallbackSceneName, releaseOthers = true }) {
   return page.evaluate(async ({ name, sceneName, releaseOthers }) => {
      const actor = game.actors.getName(name);
      if (!actor) {
         throw new Error(`controlFixtureActorToken: no actor named "${name}" exists in the world.`);
      }

      // Reuse the active scene; fall back to creating one and report its id for cleanup.
      /** @type {Scene|null} The scene hosting the fixture token. */
      let scene = game.scenes.active;
      /** @type {string|null} The created fallback scene's id, when no scene was created before. */
      let fallbackId = null;

      // Reuses a same-named fallback scene before creating one, so the world holds at most one scene per
      // fallback name even though most callers never delete the id returned below.
      if (!scene) {
         scene = game.scenes.getName(sceneName) ?? null;
         if (scene) {
            await scene.activate();
         }
      }

      if (!scene) {
         scene = await Scene.create({
            name: sceneName,
            active: true,
         });
         fallbackId = scene.id;
      }

      // Activating a scene starts an asynchronous canvas draw. A token created before it finishes gets a
      // placeable at once, but drawn against layers and render-flag queues that do not exist yet
      // (`GridLayer.addHighlightLayer` reads an undefined container, and a later update throws in
      // `RenderFlags.set` on the undefined `canvas.pendingRenderFlags`, which `Canvas#draw` creates only in
      // its ticker activation, client/canvas/board.mjs:1209, 2550-2587). So wait for the scene's draw first.
      await titanWait(() => canvas.ready && canvas.scene?.id === scene.id, { message: 'scene canvas drawn' });

      const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
         await actor.getTokenDocument({
            x: 100,
            y: 100,
         }),
      ]);

      // titanWait THROWS on exhaustion — a never-drawn placeable fails loudly right here.
      await titanWait(() => !!tokenDoc.object, { message: 'token placeable drawn' });
      tokenDoc.object.control({ releaseOthers });

      game.titan.playerHud?.refresh();
      return fallbackId;
   }, {
      name: actorName,
      sceneName: fallbackSceneName,
      releaseOthers,
   });
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

/**
 * Sets the migration mode and reloads the world as the same GM, returning once the load has passed its migration
 * attempt (onceReady builds the Player HUD after it, whether or not it succeeded) and its GM is the active GM.
 * @param {import('@playwright/test').Page} page - The logged-in page.
 * @param {string} mode - The migration mode.
 * @returns {Promise<void>} Resolves once the reloaded world finished onceReady.
 */
export async function reloadWithMode(page, mode) {
   await page.evaluate((value) => game.settings.set('titan', 'migrationMode', value), mode);
   await reloadWorld(page, { ready: () => globalThis.game?.ready === true && !!game.titan?.playerHud });
   await expectActiveGM(page);
}
