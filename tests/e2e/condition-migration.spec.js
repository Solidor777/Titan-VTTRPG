import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * The condition-effect sync on a GM world load: Disabled leaves a stale condition, Prompt asks and leaves it until
 * confirmed, and Automatic rewrites it on a world actor and on an unlinked token's own effect, deleting the description
 * each stored, including from a condition whose rules elements were already current.
 */

/** @type {string} The description text a condition created before this change stores in `flags.titan.description`. */
const LEGACY_DESCRIPTION = '<p>E2E legacy stored description</p>';

/** @type {string} Name of the world actor carrying a stale Blinded and a Prone that stores a description. */
const WORLD_ACTOR_NAME = 'E2E Migration World Actor';

/** @type {string} Name of the actor whose unlinked token carries a token-only stale Deafened. */
const TOKEN_ACTOR_NAME = 'E2E Migration Token Actor';

/** @type {string} Name of the scene holding the unlinked token. */
const SCENE_NAME = 'E2E Migration Scene';

/**
 * Blinded's rules elements before the 09_26 rules (flat -1).
 * @type {object[]}
 */
const STALE_BLINDED = [
   'melee',
   'accuracy',
   'defense',
].map((key) => ({
   operation: 'flatModifier',
   selector: 'rating',
   key,
   value: -1,
   uuid: `condition-blinded-${key}`,
}));

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The migration mode in force before this spec. */
let originalMode;
/** @type {{sceneId: string, tokenId: string}} The seeded scene and unlinked token. */
let seeded;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await closeAllApps(page);
   originalMode = await page.evaluate(() => game.settings.get('titan', 'migrationMode'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async ({ mode, sceneName }) => {
      await game.settings.set('titan', 'migrationMode', mode);
      await game.scenes.getName(sceneName)?.delete();
   }, {
      mode: originalMode,
      sceneName: SCENE_NAME,
   });
   await deleteFixtureActor(page, WORLD_ACTOR_NAME);
   await deleteFixtureActor(page, TOKEN_ACTOR_NAME);
   await page?.close();
});

/**
 * Seeds, in their pre-09_26 forms (each storing a description, as `setupConditions` wrote one on every condition): a
 * world actor's Blinded with flat -1 elements and its Prone with current elements, and an unlinked token whose own
 * actor carries a Deafened with no rules elements.
 * @returns {Promise<{sceneId: string, tokenId: string}>} The seeded scene and token ids.
 */
function seedStaleConditions() {
   return page.evaluate(async ({ worldActorName, tokenActorName, sceneName, staleBlinded, legacyDescription }) => {
      await game.actors.getName(worldActorName)?.delete();
      await game.actors.getName(tokenActorName)?.delete();
      await game.scenes.getName(sceneName)?.delete();

      /** @type {TitanActor} The player actor that holds the seeded Blinded and Prone. */
      const worldActor = await Actor.create({
         name: worldActorName,
         type: 'player',
      });
      await worldActor.toggleStatusEffect('blinded', { active: true });
      await worldActor.effects.find((effect) => effect.statuses.has('blinded')).update({
         'flags.titan.description': legacyDescription,
         'system.rulesElement': staleBlinded,
      });

      // Prone keeps the current elements it was created with; only its stored description is stale.
      await worldActor.toggleStatusEffect('prone', { active: true });
      await worldActor.effects.find((effect) => effect.statuses.has('prone')).update({
         'flags.titan.description': legacyDescription,
      });

      /** @type {TitanActor} The base actor of the unlinked token. */
      const tokenActor = await Actor.create({
         name: tokenActorName,
         prototypeToken: { actorLink: false },
         type: 'npc',
      });

      /** @type {Scene} The fixture scene. */
      const scene = await Scene.create({ name: sceneName });

      /** @type {TokenDocument[]} The created token, alone in the array. */
      const [token] = await scene.createEmbeddedDocuments('Token', [
         {
            actorId: tokenActor.id,
            actorLink: false,
            name: tokenActorName,
            x: 0,
            y: 0,
         },
      ]);
      await token.actor.toggleStatusEffect('deafened', { active: true });
      await token.actor.effects.find((effect) => effect.statuses.has('deafened')).update({
         'flags.titan.description': legacyDescription,
         'system.rulesElement': [],
      });
      return {
         sceneId: scene.id,
         tokenId: token.id,
      };
   }, {
      legacyDescription: LEGACY_DESCRIPTION,
      sceneName: SCENE_NAME,
      staleBlinded: STALE_BLINDED,
      tokenActorName: TOKEN_ACTOR_NAME,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * Reads, for each seeded condition, whether its stored rules elements equal its definition's and whether it still
 * stores a description.
 * @returns {Promise<Record<'blinded'|'deafened'|'prone', {current: boolean, storesDescription: boolean}>>} Each
 * condition's state.
 */
function readSynced() {
   return page.evaluate(({ worldActorName, sceneId, tokenId }) => {
      /**
       * Reads a condition effect's stored state against its CONFIG.statusEffects definition. `foundry.utils.equals`
       * compares arrays element by element and plain objects key by key, so stored key order never decides it.
       * @param {TitanActor} actor - The actor carrying the effect.
       * @param {string} id - The condition id.
       * @returns {{current: boolean, storesDescription: boolean}} Whether its rules elements match its definition's,
       * and whether it stores a description.
       */
      const read = (actor, id) => {
         /** @type {object} The condition effect's stored data. */
         const source = actor.effects.find((entry) => entry.statuses.has(id)).toObject();

         /** @type {object} The condition's definition. */
         const definition = CONFIG.statusEffects.find((condition) => condition.id === id);
         return {
            current: foundry.utils.equals(source.system.rulesElement, definition.system?.rulesElement ?? []),
            storesDescription: source.flags.titan?.description !== undefined,
         };
      };

      /** @type {TitanActor} The player actor that holds the seeded Blinded and Prone. */
      const worldActor = game.actors.getName(worldActorName);
      return {
         blinded: read(worldActor, 'blinded'),
         deafened: read(game.scenes.get(sceneId).tokens.get(tokenId).actor, 'deafened'),
         prone: read(worldActor, 'prone'),
      };
   }, {
      sceneId: seeded.sceneId,
      tokenId: seeded.tokenId,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * The seeded conditions' state before any sync: Blinded and Deafened stale, Prone current, and all three storing a
 * description.
 * @type {Record<string, {current: boolean, storesDescription: boolean}>}
 */
const UNSYNCED = {
   blinded: {
      current: false,
      storesDescription: true,
   },
   deafened: {
      current: false,
      storesDescription: true,
   },
   prone: {
      current: true,
      storesDescription: true,
   },
};

/**
 * The state every seeded condition reaches after the sync: current rules elements and no stored description.
 * @type {{current: boolean, storesDescription: boolean}}
 */
const SYNCED = {
   current: true,
   storesDescription: false,
};

/**
 * Sets the migration mode and reloads the world as the same GM, returning once the load has passed its migration
 * attempt (onceReady builds the Player HUD after it, whether or not it succeeded).
 * @param {string} mode - The migration mode.
 * @returns {Promise<void>} Resolves once the reloaded world finished onceReady.
 */
async function reloadWithMode(mode) {
   await page.evaluate((value) => game.settings.set('titan', 'migrationMode', value), mode);
   await page.reload();
   await page.waitForURL('**/game', { timeout: 15_000 });
   await page.waitForFunction(
      () => globalThis.game?.ready === true && !!game.titan?.playerHud,
      null,
      { timeout: 60_000 },
   );
}

test('Disabled and Prompt leave stale conditions; Automatic syncs world and token-only ones', async () => {
   seeded = await seedStaleConditions();
   expect(await readSynced()).toEqual(UNSYNCED);

   // Disabled: the load passed its migration step without touching the stale conditions.
   await reloadWithMode('disabled');
   expect(await readSynced()).toEqual(UNSYNCED);

   // Prompt: the migration dialog asks first; nothing is rewritten until the GM confirms.
   await reloadWithMode('prompt');

   /** @type {string} The migration dialog's localized description. */
   const promptText = await page.evaluate(() => game.i18n.localize('LOCAL.confirmMigrateWorld.desc.text'));
   await expect(page.locator('.application.titan-dialog').filter({ hasText: promptText })).toBeVisible();
   expect(await readSynced()).toEqual(UNSYNCED);
   await closeAllApps(page);

   // Automatic: every seeded condition is synced before the load finishes, the current Prone included (its stored
   // description alone made it stale). Synced means the stored data the next scan reads matches the definition and
   // holds no description, so that scan finds nothing to write (the unit tests pin the scan itself).
   await reloadWithMode('automatic');
   expect(await readSynced()).toEqual({
      blinded: SYNCED,
      deafened: SYNCED,
      prone: SYNCED,
   });
});
