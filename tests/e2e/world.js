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

/**
 * Attach a single page-error collector to the shared page and return its backing array. Wire this ONCE in
 * the spec's `beforeAll`; clear it each `afterEach` (`errors.length = 0`) so each test still asserts
 * "no uncaught errors during MY actions". Replaces per-test `page.on('pageerror', …)` listeners, which
 * would otherwise stack on a reused page.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @returns {string[]} The live array of collected uncaught-error messages.
 */
export function attachPageErrors(page) {
   /** @type {string[]} The collected uncaught page-error messages. */
   const errors = [];
   page.on('pageerror', (error) => {
      errors.push(error.message);
   });
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
 * @param {string} actorName - The fixture actor's name.
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
 * active), waits until the placeable is DRAWN (throwing with a clear message on exhaustion — a
 * never-drawn placeable must fail here, not at a later, less-diagnostic timeout), controls it, and
 * refreshes the Effect HUD so the GM resolution ladder (first SELECTED token) resolves the actor.
 * @param {import('@playwright/test').Page} page - The shared page.
 * @param {object} options - Control options.
 * @param {string} options.actorName - The fixture actor's name (must already exist).
 * @param {string} options.fallbackSceneName - Name for the fallback scene if none is active.
 * @returns {Promise<string|null>} The created fallback scene's id for afterAll cleanup, or null.
 */
export async function controlFixtureActorToken(page, { actorName, fallbackSceneName }) {
   return page.evaluate(async ({ name, sceneName }) => {
      const actor = game.actors.getName(name);

      // Reuse the active scene; fall back to creating one and report its id for cleanup.
      /** @type {Scene|null} The scene hosting the fixture token. */
      let scene = game.scenes.active;
      /** @type {string|null} The created fallback scene's id, when no scene was active. */
      let fallbackId = null;
      if (!scene) {
         scene = await Scene.create({
            name: sceneName,
            active: true,
         });
         fallbackId = scene.id;
      }

      const [tokenDoc] = await scene.createEmbeddedDocuments('Token', [
         await actor.getTokenDocument({
            x: 100,
            y: 100,
         }),
      ]);

      // titanWait THROWS on exhaustion — a never-drawn placeable fails loudly right here.
      await titanWait(() => !!tokenDoc.object, { message: 'token placeable drawn' });
      tokenDoc.object.control({ releaseOthers: true });

      game.titan.effectHud.refresh();
      return fallbackId;
   }, {
      name: actorName,
      sceneName: fallbackSceneName,
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
