import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   closeAllApps,
   deleteFixtureActor,
   expectActiveGM,
   reloadWithMode,
} from './world.js';

/**
 * A converted Active Effect takes its legacy Item's `_id`, the identity core relates an unlinked token's delta to its
 * base actor by. No legacy effect Item can be seeded (the server rejects the unregistered subtype), so this spec pins,
 * with registered documents, the core ActorDelta behaviour the stored-actor migration relies on: an effect created
 * with `keepId` keeps its id beside an Item with the same id on the same actor; deleting an inherited effect from a
 * synthetic actor stores a tombstone in the token's delta, and an effect created with `keepId` over that tombstone
 * overrides the base actor's effect, as stored by the server (read again after a reload). It then seeds an unlinked
 * token whose base actor holds conversions of Items the token removed or converted itself, two of them stamped by an
 * older version under another id, and checks that an Automatic load hides exactly those and leaves an unclaimed one,
 * and that the next Automatic load writes nothing. Then it imports a world Adventure (`Adventure#import`) whose scene
 * token's delta overrides one of its Adventure actor's effects and tombstones another, beside a token on a world actor,
 * and checks what core shows once the data is in the world: the token's own effect over its base actor's, the
 * tombstoned one hidden, and the world actor's effect inherited. In world packs it pins the same calls the stored-actor
 * walk makes on a packed actor, then on an unlinked token of a packed scene (unlock, `pack.getDocument`, a `keepId`
 * create, lock again), each read back after a reload, and then checks that an Automatic load hides a packed token's
 * inherited conversions as it does a world token's. Last, it seeds a world Adventure whose scene token's own data
 * claims conversions its Adventure actor holds, and checks that an Automatic load stores the tombstones that hide them
 * in the Adventure's data, that the next Automatic load writes nothing, and that the imported token no longer shows
 * them. Every reload clears the console capture first and proves the capture holds the new load (the system's start-up
 * line), so a missing unlock or summary line is an absence on a capture whose presence is proven. The spec's GM must be
 * the active GM, the one client that migrates, and each load asserts it.
 */

/** @type {string} Name of the throwaway world actor of the `keepId` test. */
const WORLD_ACTOR_NAME = 'E2E Identity World Actor';

/** @type {string} Name of the base actor of the unlinked tokens. */
const BASE_ACTOR_NAME = 'E2E Identity Base Actor';

/** @type {string} Name of the hide tests' unlinked tokens, apart from their base actors' names (#102). */
const HIDE_TOKEN_NAME = 'E2E Identity Hide Token';

/** @type {string} Name of the world scene holding the unlinked tokens. */
const SCENE_NAME = 'E2E Identity Scene';

/** @type {string} Name of the Adventure's actor, a world actor once imported. */
const ADVENTURE_ACTOR_NAME = 'E2E Identity Adventure Actor';

/** @type {string} Name of the Adventure's scene, a world scene once imported. */
const ADVENTURE_SCENE_NAME = 'E2E Identity Adventure Scene';

/** @type {string} Name of the world actor the Adventure's second token names, outside the Adventure. */
const WORLD_BASE_NAME = 'E2E Identity World Base';

/** @type {string} Name of the hide test's Adventure actor, a world actor while imported. */
const HIDE_ADVENTURE_ACTOR_NAME = 'E2E Identity Hide Adventure Actor';

/** @type {string} Name of the hide test's Adventure scene, a world scene while imported. */
const HIDE_ADVENTURE_SCENE_NAME = 'E2E Identity Hide Adventure Scene';

/** @type {{label: string, name: string, type: string}} The world Adventure pack holding the imported Adventure. */
const ADVENTURE_PACK = {
   label: 'E2E Identity Adventures',
   name: 'e2e-identity-adventures',
   type: 'Adventure',
};

/** @type {string} Name of the world base actor of the packed scenes' unlinked tokens. */
const PACK_BASE_NAME = 'E2E Identity Pack Base';

/** @type {string} Name of the world scene a packed scene is copied from, deleted once copied. */
const PACK_SOURCE_SCENE_NAME = 'E2E Identity Pack Source Scene';

/**
 * The world packs of the pack tests, each created afresh by the test that uses it.
 * @type {Record<'actor'|'scene', {label: string, name: string, type: string}>}
 */
const IDENTITY_PACKS = {
   actor: {
      label: 'E2E Identity Actors',
      name: 'e2e-identity-actors',
      type: 'Actor',
   },
   scene: {
      label: 'E2E Identity Scenes',
      name: 'e2e-identity-scenes',
      type: 'Scene',
   },
};

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The migration mode before the spec, restored afterwards. */
let originalMode;
/** @type {string[]} Console message texts of the current load (the listener survives reloads; cleared per reload). */
const consoleLines = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   page.on('console', (message) => {
      consoleLines.push(message.text());
   });
   await login(page);

   // The login's own migration attempt finished once the Player HUD is built.
   await page.waitForFunction(() => !!game.titan?.playerHud, null, { timeout: 60_000 });
   await expectActiveGM(page);
   await closeAllApps(page);
   originalMode = await page.evaluate(() => game.settings.get('titan', 'migrationMode'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

/**
 * Clears the console capture, reloads the world in a migration mode (reloadWithMode), and proves the capture holds the
 * new load by its system start-up line, so a line missing afterwards is an absence on a capture whose presence is
 * proven.
 * @param {string} mode - The `migrationMode` of the load ('automatic' or 'disabled').
 * @returns {Promise<void>} Resolves once the world has loaded and the capture is proven.
 */
async function reloadCapturingConsole(mode) {
   consoleLines.length = 0;
   await reloadWithMode(page, mode);
   expect(consoleLines.some((line) => line.includes('TITAN | Starting Titan VTTRPG System')), 'this load is captured')
      .toBe(true);
}

/**
 * Reads the updated counts the captured `Stored actors migrated:` summary lines report. The stored-actor pass logs one
 * summary per run, and its counts cover every stored actor it walked in the world, not this spec's alone; a load whose
 * scan finds nothing to migrate runs no pass and logs none.
 * @returns {number[]} The updated counts, one per summary line, in capture order.
 */
function readUpdatedCounts() {
   return consoleLines
      .map((line) => line.match(/Stored actors migrated: (\d+) updated/))
      .filter(Boolean)
      .map((match) => Number(match[1]));
}

/**
 * Reads the failed counts the captured `Stored actors migrated:` summary lines report; like the updated counts, they
 * cover every stored actor the pass walked in the world.
 * @returns {number[]} The failed counts, one per summary line, in capture order.
 */
function readFailedCounts() {
   return consoleLines
      .map((line) => line.match(/Stored actors migrated: \d+ updated, \d+ skipped, (\d+) failed\./))
      .filter(Boolean)
      .map((match) => Number(match[1]));
}

/**
 * Lists the captured lines that report a stored actor failing to migrate (the pass's console error, which names the
 * actor as the walk names it).
 * @param {string} name - The stored actor's name.
 * @returns {string[]} The failure lines naming that actor.
 */
function readActorFailureLines(name) {
   return consoleLines.filter((line) => line.includes(`Failed to migrate the stored actor "${name}"`));
}

/**
 * Lists the captured lines that report the stored-actor walk unlocking a world pack.
 * @param {string} label - The pack's label.
 * @returns {string[]} The unlock lines naming that pack.
 */
function readUnlockLines(label) {
   return consoleLines.filter((line) => line.includes(`Unlocked world pack "${label}"`));
}

/**
 * Deletes the Adventure imports' leftovers: both imported scenes, the spec's Adventure pack, and the import records
 * core keeps for that pack's Adventures (`core.adventureImports`, keyed by the Adventure's UUID). The imported actors
 * and the world base actor are deleted by name (deleteFixtureActor).
 * @returns {Promise<void>} Resolves once deleted.
 */
async function deleteAdventureImport() {
   await page.evaluate(async ({ pack, sceneNames }) => {
      for (const sceneName of sceneNames) {
         await game.scenes.getName(sceneName)?.delete();
      }

      /** @type {CompendiumCollection|undefined} The spec's Adventure pack, if it exists. */
      const adventurePack = game.packs.get(`world.${pack.name}`);
      if (adventurePack) {
         await adventurePack.configure({ locked: false });
         await adventurePack.deleteCompendium();
      }

      /** @type {Record<string, object>} The import records, keyed by Adventure UUID. */
      const imports = game.settings.get('core', 'adventureImports');

      /** @type {string} The UUID prefix of the spec pack's Adventures. */
      const prefix = `Compendium.world.${pack.name}.`;
      if (Object.keys(imports).some((uuid) => uuid.startsWith(prefix))) {
         await game.settings.set('core', 'adventureImports', Object.fromEntries(Object.entries(imports)
            .filter(([uuid]) => !uuid.startsWith(prefix))));
      }
   }, {
      pack: ADVENTURE_PACK,
      sceneNames: [
         ADVENTURE_SCENE_NAME,
         HIDE_ADVENTURE_SCENE_NAME,
      ],
   });
}

/**
 * Deletes the pack tests' world packs, and the source scene a failed run may have left.
 * @returns {Promise<void>} Resolves once deleted.
 */
function deleteIdentityPacks() {
   return page.evaluate(async ({ packs, sourceSceneName }) => {
      await game.scenes.getName(sourceSceneName)?.delete();
      for (const { name } of Object.values(packs)) {
         /** @type {CompendiumCollection|undefined} A pack test's pack, if it exists. */
         const stalePack = game.packs.get(`world.${name}`);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }
      }
   }, {
      packs: IDENTITY_PACKS,
      sourceSceneName: PACK_SOURCE_SCENE_NAME,
   });
}

/**
 * Creates the pack tests' world packs afresh (unlocked), after deleting any a previous test or run left, and deletes
 * the world base actor of the packed tokens.
 * @returns {Promise<void>} Resolves once created.
 */
async function recreateIdentityPacks() {
   await deleteIdentityPacks();
   await page.evaluate(async ({ baseName, packs }) => {
      await game.actors.getName(baseName)?.delete();
      for (const { label, name, type } of Object.values(packs)) {
         await foundry.documents.collections.CompendiumCollection.createCompendium({
            label,
            name,
            type,
         });
      }
   }, {
      baseName: PACK_BASE_NAME,
      packs: IDENTITY_PACKS,
   });
}

test.afterAll(async () => {
   await page.evaluate(async ({ mode, sceneName }) => {
      await game.settings.set('titan', 'migrationMode', mode);
      await game.scenes.getName(sceneName)?.delete();
   }, {
      mode: originalMode,
      sceneName: SCENE_NAME,
   });
   await deleteAdventureImport();
   await deleteIdentityPacks();
   await deleteFixtureActor(page, WORLD_ACTOR_NAME);
   await deleteFixtureActor(page, BASE_ACTOR_NAME);
   await deleteFixtureActor(page, ADVENTURE_ACTOR_NAME);
   await deleteFixtureActor(page, WORLD_BASE_NAME);
   await deleteFixtureActor(page, PACK_BASE_NAME);
   await deleteFixtureActor(page, HIDE_ADVENTURE_ACTOR_NAME);
   await page?.close();
});

/**
 * Creates the base actor and an unlinked token of it on a fresh world scene.
 * @param {string} [tokenName] - The token's name; the base actor's name by default.
 * @returns {Promise<{baseId: string, sceneId: string, tokenId: string}>} The ids of the base actor, scene, and token.
 */
function seedToken(tokenName = BASE_ACTOR_NAME) {
   return page.evaluate(async ({ actorName, sceneName, tokenName: name }) => {
      await game.scenes.getName(sceneName)?.delete();
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The base actor. */
      const base = await Actor.create({
         name: actorName,
         prototypeToken: { actorLink: false },
         type: 'npc',
      });

      /** @type {Scene} The world scene. */
      const scene = await Scene.create({ name: sceneName });

      /** @type {TokenDocument[]} The unlinked token, alone in the array. */
      const [token] = await scene.createEmbeddedDocuments('Token', [
         {
            actorId: base.id,
            actorLink: false,
            name,
            x: 0,
            y: 0,
         },
      ]);
      return {
         baseId: base.id,
         sceneId: scene.id,
         tokenId: token.id,
      };
   }, {
      actorName: BASE_ACTOR_NAME,
      sceneName: SCENE_NAME,
      tokenName,
   });
}

test('an effect created with keepId keeps its id beside an Item with the same id on the same actor', async () => {
   await expectActiveGM(page);

   /** @type {{effectId: string|null, itemId: string, stored: object}} The ids, and the actor's stored ids. */
   const outcome = await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The throwaway world actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'npc',
      });

      /** @type {Item[]} The Item, alone in the array. */
      const [item] = await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Identity Item',
            type: 'commodity',
         },
      ]);

      /** @type {TitanActiveEffect[]} The effect created with the Item's id, alone in the array. */
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            _id: item.id,
            name: 'E2E Identity Effect',
            type: 'effect',
         },
      ], { keepId: true });
      return {
         effectId: effect?.id ?? null,
         itemId: item.id,
         stored: {
            effects: actor._source.effects.map((entry) => entry._id),
            items: actor._source.items.map((entry) => entry._id),
         },
      };
   }, WORLD_ACTOR_NAME);
   expect(outcome.effectId).toBe(outcome.itemId);
   expect(outcome.stored).toEqual({
      effects: [outcome.itemId],
      items: [outcome.itemId],
   });
});

test('a token hides an inherited effect with a tombstone, and an effect created over it with its id overrides the base',
   async () => {
      test.setTimeout(120_000);
      await expectActiveGM(page);

      /** @type {{baseId: string, sceneId: string, tokenId: string}} The seeded ids. */
      const seeded = await seedToken();

      /** @type {string} The id of the base actor's effect. */
      const effectId = await page.evaluate(async ({ baseId }) => {
         /** @type {TitanActiveEffect[]} The base actor's effect, alone in the array. */
         const [effect] = await game.actors.get(baseId).createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E Base Effect',
               type: 'effect',
            },
         ]);
         return effect.id;
      }, seeded);

      /**
       * Reads the base actor's and the token's view of the effect, and the token's stored delta entry with its id.
       * @returns {Promise<{baseName: string|null, entry: object|null, shownName: string|null}>} The views.
       */
      const read = () => page.evaluate(({ baseId, id, sceneId, tokenId }) => {
         /** @type {TokenDocument} The unlinked token. */
         const token = game.scenes.get(sceneId).tokens.get(tokenId);

         /** @type {object|undefined} The delta's stored entry with the effect's id. */
         const entry = token._source.delta?.effects?.find((effect) => effect._id === id);
         return {
            baseName: game.actors.get(baseId).effects.get(id)?.name ?? null,
            entry: entry
               ? {
                  name: entry.name ?? null,
                  tombstone: entry._tombstone === true,
               }
               : null,
            shownName: token.actor.effects.get(id)?.name ?? null,
         };
      }, {
         ...seeded,
         id: effectId,
      });

      // Presence first: the token shows the base actor's effect and its delta holds nothing for it.
      expect(await read()).toEqual({
         baseName: 'E2E Base Effect',
         entry: null,
         shownName: 'E2E Base Effect',
      });

      await page.evaluate(({ id, sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor
         .deleteEmbeddedDocuments('ActiveEffect', [id]), {
         ...seeded,
         id: effectId,
      });
      expect(await read()).toEqual({
         baseName: 'E2E Base Effect',
         entry: {
            name: null,
            tombstone: true,
         },
         shownName: null,
      });

      await page.evaluate(({ id, sceneId, tokenId }) => game.scenes.get(sceneId).tokens.get(tokenId).actor
         .createEmbeddedDocuments('ActiveEffect', [
            {
               _id: id,
               name: 'E2E Token Override',
               type: 'effect',
            },
         ], { keepId: true }), {
         ...seeded,
         id: effectId,
      });

      /** @type {object} The views once the token's own effect took the slot. */
      const overridden = {
         baseName: 'E2E Base Effect',
         entry: {
            name: 'E2E Token Override',
            tombstone: false,
         },
         shownName: 'E2E Token Override',
      };
      expect(await read()).toEqual(overridden);

      // The server stored what the client shows: a Disabled load reads it back without migrating.
      await reloadCapturingConsole('disabled');
      expect(await read()).toEqual(overridden);
   });

test('an Automatic load hides the inherited conversions a token\'s own data claims, once', async () => {
   test.setTimeout(300_000);
   await expectActiveGM(page);

   // Named apart from its base actor so core stores its delta at creation (#102).
   /** @type {{baseId: string, sceneId: string, tokenId: string}} The seeded ids. */
   const seeded = await seedToken(HIDE_TOKEN_NAME);

   /** @type {{hidden: string[], ownId: string, unclaimedId: string}} The effects the migration hides and keeps. */
   const ids = await page.evaluate(async ({ baseId, sceneId, tokenId }) => {
      /** @type {TitanActor} The base actor. */
      const base = game.actors.get(baseId);

      /** @type {TokenDocument} The unlinked token. */
      const token = game.scenes.get(sceneId).tokens.get(tokenId);

      /** @type {Item[]} Two Items the token removes, in the order core returns them (not the data's order). */
      const removedItems = await base.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Removed Item',
            type: 'commodity',
         },
         {
            name: 'E2E Removed Item (older conversion)',
            type: 'commodity',
         },
      ]);

      /** @type {Item} The removed Item whose conversion takes its id. */
      const removed = removedItems.find((item) => item.name === 'E2E Removed Item');

      /** @type {Item} The removed Item whose conversion has another id (an older version's). */
      const removedOlder = removedItems.find((item) => item.name === 'E2E Removed Item (older conversion)');

      // The token removes both inherited Items: its delta stores a tombstone for each.
      await token.actor.deleteEmbeddedDocuments('Item', [
         removed.id,
         removedOlder.id,
      ]);

      // The base actor converts them: one conversion takes its Item's id, one has another id (an older version's).
      await base.deleteEmbeddedDocuments('Item', [
         removed.id,
         removedOlder.id,
      ]);

      /** @type {string} The id of an Item the token converted itself. */
      const ownItemId = foundry.utils.randomID();

      /**
       * Builds the conversion stamp of an Item.
       * @param {string} itemId - The id of the converted Item the stamp names.
       * @returns {object} The effect's flags.
       */
      const stamp = (itemId) => ({
         titan: {
            convertedFromItem: itemId,
         },
      });

      /** @type {TitanActiveEffect[]} The base actor's conversions, in the order core returns them. */
      const conversions = await base.createEmbeddedDocuments('ActiveEffect', [
         {
            _id: removed.id,
            flags: stamp(removed.id),
            name: 'E2E Converted Removed',
            type: 'effect',
         },
         {
            flags: stamp(removedOlder.id),
            name: 'E2E Converted Removed (older id)',
            type: 'effect',
         },
         {
            flags: stamp(ownItemId),
            name: 'E2E Converted Owned (older id)',
            type: 'effect',
         },
         {
            flags: stamp(foundry.utils.randomID()),
            name: 'E2E Converted Unclaimed',
            type: 'effect',
         },
      ], { keepId: true });

      // The token holds its own conversion of the Item behind the third conversion above.
      await token.actor.createEmbeddedDocuments('ActiveEffect', [
         {
            _id: ownItemId,
            flags: stamp(ownItemId),
            name: 'E2E Token Own Conversion',
            type: 'effect',
         },
      ], { keepId: true });

      /**
       * Reads the id of the conversion with the given name.
       * @param {string} name - The name the seed gave the conversion.
       * @returns {string} Its id.
       */
      const conversionId = (name) => conversions.find((effect) => effect.name === name).id;
      return {
         hidden: [
            conversionId('E2E Converted Removed'),
            conversionId('E2E Converted Removed (older id)'),
            conversionId('E2E Converted Owned (older id)'),
         ],
         ownId: ownItemId,
         unclaimedId: conversionId('E2E Converted Unclaimed'),
      };
   }, seeded);

   /**
    * Reads the effects the token shows and its stored delta's effect and Item entries, tombstones marked.
    * @returns {Promise<{effects: string[], items: string[], shown: string[]}>} The sorted ids.
    */
   const readToken = () => page.evaluate(({ sceneId, tokenId }) => {
      /** @type {TokenDocument} The unlinked token. */
      const token = game.scenes.get(sceneId).tokens.get(tokenId);

      /**
       * Lists stored entries' ids, a tombstone's marked.
       * @param {object[]|undefined} entries - The stored entries.
       * @returns {string[]} The sorted ids.
       */
      const list = (entries) => (entries ?? [])
         .map((entry) => (entry._tombstone ? `${entry._id}:tombstone` : entry._id))
         .sort();
      return {
         effects: list(token._source.delta?.effects),
         items: list(token._source.delta?.items),
         shown: token.actor.effects.map((effect) => effect.id).sort(),
      };
   }, seeded);

   /** @type {{effects: string[], items: string[], shown: string[]}} The token before the migration. */
   const before = await readToken();

   // Presence first: the token shows every inherited conversion, and its delta stores the two Item tombstones.
   expect(before.shown).toEqual([
      ...ids.hidden,
      ids.ownId,
      ids.unclaimedId,
   ].sort());
   expect(before.effects).toEqual([ids.ownId]);
   expect(before.items).toHaveLength(2);
   expect(before.items.every((entry) => entry.endsWith(':tombstone'))).toBe(true);

   await reloadCapturingConsole('automatic');

   /** @type {{effects: string[], items: string[], shown: string[]}} The token after the migrating load. */
   const migrated = await readToken();
   expect(migrated.shown).toEqual([
      ids.ownId,
      ids.unclaimedId,
   ].sort());
   expect(migrated.effects).toEqual([
      ids.ownId,
      ...ids.hidden.map((id) => `${id}:tombstone`),
   ].sort());
   expect(migrated.items).toEqual(before.items);

   // The pass ran and stored a change: its summary counts at least one actor updated (a world-wide count).
   /** @type {number[]} The updated counts the migrating load's summary lines report. */
   const migratingCounts = readUpdatedCounts();
   expect(migratingCounts.some((count) => count >= 1), `world-wide updated counts: [${migratingCounts}]`).toBe(true);

   // The walk names the base actor and its token by their own names.
   expect([
      ...readActorFailureLines(BASE_ACTOR_NAME),
      ...readActorFailureLines(HIDE_TOKEN_NAME),
   ], 'the migrating load failed the base actor or its token').toEqual([]);

   // A second Automatic load finds nothing to hide and writes nothing: no summary reports an actor updated or failed
   // (a load whose scan finds nothing runs no pass and logs no summary).
   await reloadCapturingConsole('automatic');
   expect(await readToken()).toEqual(migrated);
   expect([
      ...readActorFailureLines(BASE_ACTOR_NAME),
      ...readActorFailureLines(HIDE_TOKEN_NAME),
   ], 'the second load failed the base actor or its token').toEqual([]);

   /** @type {number[]} The updated counts the second load's summary lines report; none when it ran no pass. */
   const secondCounts = readUpdatedCounts();
   expect(secondCounts.filter((count) => count > 0), 'world-wide updated counts of the second load, any stored actor')
      .toEqual([]);

   /** @type {number[]} The failed counts the second load's summary lines report; none when it ran no pass. */
   const secondFailed = readFailedCounts();

   /** @type {string} The second load's captured failure lines, named in the assertion's message. */
   const failureLines = consoleLines.filter((line) => line.includes('TITAN | Failed')).join('\n');
   expect(
      secondFailed.filter((count) => count > 0),
      `world-wide failed counts of the second load, any stored actor; its failure lines:\n${failureLines}`,
   ).toEqual([]);
});

test('an imported Adventure token shows its own effect over its Adventure actor\'s and inherits from a world actor',
   async () => {
      test.setTimeout(120_000);
      await expectActiveGM(page);

      /** @type {Record<string, string>} The ids of the Adventure's documents and of the world base actor's effect. */
      const ids = await page.evaluate(async ({ actorName, pack, sceneName, worldBaseName }) => {
         await game.scenes.getName(sceneName)?.delete();
         for (const name of [
            actorName,
            worldBaseName,
         ]) {
            await game.actors.getName(name)?.delete();
         }

         /** @type {CompendiumCollection|undefined} An Adventure pack a previous run left. */
         const stalePack = game.packs.get(`world.${pack.name}`);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }
         await foundry.documents.collections.CompendiumCollection.createCompendium({
            label: pack.label,
            name: pack.name,
            type: pack.type,
         });

         /** @type {TitanActor} The world actor the second token names; the Adventure does not hold it. */
         const worldBase = await Actor.create({
            name: worldBaseName,
            prototypeToken: { actorLink: false },
            type: 'npc',
         });

         /** @type {TitanActiveEffect[]} The world base actor's effect, alone in the array. */
         const [worldEffect] = await worldBase.createEmbeddedDocuments('ActiveEffect', [
            {
               name: 'E2E World Base Effect',
               type: 'effect',
            },
         ]);

         // Fresh ids: an Adventure document whose id the world already holds is updated over it on import, not
         // created (Foundry v14 client/documents/adventure.mjs prepareImport).
         /** @type {Record<string, string>} The Adventure's document ids. */
         const fresh = {
            actor: foundry.utils.randomID(),
            hidden: foundry.utils.randomID(),
            ownToken: foundry.utils.randomID(),
            overridden: foundry.utils.randomID(),
            scene: foundry.utils.randomID(),
            worldToken: foundry.utils.randomID(),
         };

         /** @type {Adventure} The Adventure in the world Adventure pack. */
         const created = await foundry.documents.Adventure.create({
            actors: [
               {
                  _id: fresh.actor,
                  effects: [
                     {
                        _id: fresh.overridden,
                        name: 'E2E Adventure Base Overridden',
                        type: 'effect',
                     },
                     {
                        _id: fresh.hidden,
                        name: 'E2E Adventure Base Hidden',
                        type: 'effect',
                     },
                  ],
                  name: actorName,
                  prototypeToken: { actorLink: false },
                  type: 'npc',
               },
            ],
            name: 'E2E Identity Adventure',
            scenes: [
               {
                  _id: fresh.scene,
                  name: sceneName,
                  tokens: [
                     {
                        _id: fresh.ownToken,
                        actorId: fresh.actor,
                        actorLink: false,
                        delta: {
                           _id: fresh.ownToken,
                           effects: [
                              {
                                 _id: fresh.overridden,
                                 name: 'E2E Token Own',
                                 type: 'effect',
                              },
                              {
                                 _id: fresh.hidden,
                                 _tombstone: true,
                              },
                           ],
                        },
                        name: 'E2E Adventure Token',
                        x: 0,
                        y: 0,
                     },
                     {
                        _id: fresh.worldToken,
                        actorId: worldBase.id,
                        actorLink: false,
                        name: 'E2E World-Based Token',
                        x: 100,
                        y: 0,
                     },
                  ],
               },
            ],
         }, { pack: `world.${pack.name}` });

         /** @type {Adventure} The packed Adventure, as a GM opening the pack loads it. */
         const adventure = await game.packs.get(`world.${pack.name}`).getDocument(created.id);
         await adventure.import({ dialog: false });
         return {
            ...fresh,
            worldEffect: worldEffect.id,
         };
      }, {
         actorName: ADVENTURE_ACTOR_NAME,
         pack: ADVENTURE_PACK,
         sceneName: ADVENTURE_SCENE_NAME,
         worldBaseName: WORLD_BASE_NAME,
      });

      /**
       * Reads the effects the imported base actor and both imported tokens show, each as an id-to-name map.
       * @returns {Promise<{base: object|null, ownToken: object|null, worldToken: object|null}>} The shown effects.
       */
      const read = () => page.evaluate((given) => {
         /** @type {Scene|undefined} The imported scene. */
         const scene = game.scenes.get(given.scene);

         /**
          * Maps an actor's effects by id to their names.
          * @param {Actor|null|undefined} actor - The actor whose effects are read; none for a token without one.
          * @returns {object|null} The id-to-name map; null without an actor.
          */
         const shown = (actor) => (actor ? Object.fromEntries(actor.effects.map((effect) => [
            effect.id,
            effect.name,
         ])) : null);
         return {
            base: shown(game.actors.get(given.actor)),
            ownToken: shown(scene?.tokens.get(given.ownToken)?.actor),
            worldToken: shown(scene?.tokens.get(given.worldToken)?.actor),
         };
      }, ids);

      /** @type {{base: object|null, ownToken: object|null, worldToken: object|null}} What core shows. */
      const expected = {
         // Presence first: the imported base actor shows both of its effects.
         base: {
            [ids.hidden]: 'E2E Adventure Base Hidden',
            [ids.overridden]: 'E2E Adventure Base Overridden',
         },

         // The token's own effect takes its base actor's slot, and its tombstone hides the other.
         ownToken: {
            [ids.overridden]: 'E2E Token Own',
         },

         // A token whose actor id names no Adventure actor inherits from the world actor of that id.
         worldToken: {
            [ids.worldEffect]: 'E2E World Base Effect',
         },
      };
      expect(await read()).toEqual(expected);

      // The server stored what the client shows: a Disabled load reads it back without migrating.
      await reloadCapturingConsole('disabled');
      expect(await read()).toEqual(expected);
   });

test('an effect created with keepId on a packed actor keeps its id beside its Item, as the pack stores it',
   async () => {
      test.setTimeout(120_000);
      await expectActiveGM(page);
      await recreateIdentityPacks();

      /** @type {{actorId: string, itemId: string}} The packed actor's id and its Item's id. */
      const seeded = await page.evaluate(async (pack) => {
         /** @type {TitanActor} The actor in the world Actor pack, holding one Item. */
         const actor = await Actor.create({
            items: [
               {
                  name: 'E2E Packed Item',
                  type: 'commodity',
               },
            ],
            name: 'E2E Identity Packed Actor',
            type: 'npc',
         }, { pack: `world.${pack.name}` });
         await game.packs.get(`world.${pack.name}`).configure({ locked: true });
         return {
            actorId: actor.id,
            itemId: actor._source.items[0]._id,
         };
      }, IDENTITY_PACKS.actor);

      /**
       * Reads the packed actor's stored effect and Item ids, and whether its pack is locked.
       * @returns {Promise<{effects: string[], items: string[], locked: boolean}>} The stored ids and the lock.
       */
      const read = () => page.evaluate(async ({ actorId, pack }) => {
         /** @type {CompendiumCollection} The world Actor pack. */
         const compendium = game.packs.get(`world.${pack.name}`);

         /** @type {object} The packed actor's stored data. */
         const source = (await compendium.getDocument(actorId)).toObject();
         return {
            effects: source.effects.map((effect) => effect._id),
            items: source.items.map((item) => item._id),
            locked: compendium.locked,
         };
      }, {
         ...seeded,
         pack: IDENTITY_PACKS.actor,
      });

      // Presence first: the actor stores its Item, and no effect with the Item's id.
      expect(await read()).toEqual({
         effects: [],
         items: [seeded.itemId],
         locked: true,
      });

      // The calls the stored-actor walk makes for a packed actor: its pack write access unlocks the pack, its source
      // loads the actor with pack.getDocument, its target creates with keepId, and the walk locks the pack again.
      /** @type {string|null} The created effect's id. */
      const createdId = await page.evaluate(async ({ actorId, itemId, pack }) => {
         /** @type {CompendiumCollection} The world Actor pack. */
         const compendium = game.packs.get(`world.${pack.name}`);
         await compendium.configure({ locked: false });

         /** @type {TitanActor} The packed actor. */
         const actor = await compendium.getDocument(actorId);

         /** @type {TitanActiveEffect[]} The created effect, alone in the array. */
         const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
            {
               _id: itemId,
               flags: {
                  titan: {
                     convertedFromItem: itemId,
                  },
               },
               name: 'E2E Packed Conversion',
               transfer: false,
               type: 'effect',
            },
         ], { keepId: true });
         await compendium.configure({ locked: true });
         return effect?.id ?? null;
      }, {
         ...seeded,
         pack: IDENTITY_PACKS.actor,
      });
      expect(createdId).toBe(seeded.itemId);

      // What the server stored: a Disabled load reads it back without migrating.
      await reloadCapturingConsole('disabled');
      expect(await read()).toEqual({
         effects: [seeded.itemId],
         items: [seeded.itemId],
         locked: true,
      });
   });

test('an effect created with keepId on a packed scene\'s unlinked token keeps its id, as the pack stores its delta',
   async () => {
      test.setTimeout(120_000);
      await expectActiveGM(page);
      await recreateIdentityPacks();

      /** @type {{itemId: string, packEntry: string, tokenId: string}} The packed scene, its token, and its Item. */
      const seeded = await page.evaluate(async ({ baseName, pack, sourceSceneName }) => {
         /** @type {TitanActor} The world base actor of the token. */
         const base = await Actor.create({
            name: baseName,
            prototypeToken: { actorLink: false },
            type: 'npc',
         });

         /** @type {Scene} The world scene the packed scene is copied from. */
         const scene = await Scene.create({ name: sourceSceneName });

         /** @type {TokenDocument[]} The unlinked token, alone in the array. */
         const [token] = await scene.createEmbeddedDocuments('Token', [
            {
               actorId: base.id,
               actorLink: false,
               name: baseName,
               x: 0,
               y: 0,
            },
         ]);
         await token.actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Packed Token Item',
               type: 'commodity',
            },
         ]);

         /** @type {object} The world scene's data, its token's delta (and so the Item) included. */
         const packedSceneData = scene.toObject();
         delete packedSceneData._id;
         packedSceneData.name = `${sourceSceneName} (packed)`;

         /** @type {Scene} The scene in the world Scene pack. */
         const packedScene = await Scene.create(packedSceneData, { pack: `world.${pack.name}` });
         await scene.delete();
         await game.packs.get(`world.${pack.name}`).configure({ locked: true });

         /** @type {TokenDocument} The packed scene's unlinked token. */
         const packedToken = packedScene.tokens.find((entry) => entry.name === baseName);
         return {
            itemId: packedToken._source.delta.items[0]._id,
            packEntry: packedScene.id,
            tokenId: packedToken.id,
         };
      }, {
         baseName: PACK_BASE_NAME,
         pack: IDENTITY_PACKS.scene,
         sourceSceneName: PACK_SOURCE_SCENE_NAME,
      });

      /**
       * Reads the packed token's stored delta effect and Item ids, the effects its synthetic actor shows, and whether
       * its pack is locked.
       * @returns {Promise<{effects: string[], items: string[], locked: boolean, shown: string[]}>} The ids, and the
       * lock.
       */
      const read = () => page.evaluate(async ({ pack, packEntry, tokenId }) => {
         /** @type {CompendiumCollection} The world Scene pack. */
         const compendium = game.packs.get(`world.${pack.name}`);

         /** @type {TokenDocument} The packed scene's unlinked token. */
         const token = (await compendium.getDocument(packEntry)).tokens.get(tokenId);
         return {
            effects: (token._source.delta?.effects ?? []).map((effect) => effect._id),
            items: (token._source.delta?.items ?? []).map((item) => item._id),
            locked: compendium.locked,
            shown: token.actor.effects.map((effect) => effect.id),
         };
      }, {
         ...seeded,
         pack: IDENTITY_PACKS.scene,
      });

      // Presence first: the token's delta stores its Item, and no effect with the Item's id is stored or shown.
      expect(await read()).toEqual({
         effects: [],
         items: [seeded.itemId],
         locked: true,
         shown: [],
      });

      // The calls the stored-actor walk makes for a packed scene's token: unlock, pack.getDocument, the token's
      // document by id, a keepId create through its synthetic actor, and the lock again.
      /** @type {string|null} The created effect's id. */
      const createdId = await page.evaluate(async ({ itemId, pack, packEntry, tokenId }) => {
         /** @type {CompendiumCollection} The world Scene pack. */
         const compendium = game.packs.get(`world.${pack.name}`);
         await compendium.configure({ locked: false });

         /** @type {TokenDocument} The packed scene's unlinked token. */
         const token = (await compendium.getDocument(packEntry)).tokens.get(tokenId);

         /** @type {TitanActiveEffect[]} The created effect, alone in the array. */
         const [effect] = await token.actor.createEmbeddedDocuments('ActiveEffect', [
            {
               _id: itemId,
               flags: {
                  titan: {
                     convertedFromItem: itemId,
                  },
               },
               name: 'E2E Packed Token Conversion',
               transfer: false,
               type: 'effect',
            },
         ], { keepId: true });
         await compendium.configure({ locked: true });
         return effect?.id ?? null;
      }, {
         ...seeded,
         pack: IDENTITY_PACKS.scene,
      });
      expect(createdId).toBe(seeded.itemId);

      // What the server stored: a Disabled load reads it back without migrating.
      await reloadCapturingConsole('disabled');
      expect(await read()).toEqual({
         effects: [seeded.itemId],
         items: [seeded.itemId],
         locked: true,
         shown: [seeded.itemId],
      });
   });

test('an Automatic load hides the inherited conversions a packed scene token\'s own data claims, once', async () => {
   test.setTimeout(300_000);
   await expectActiveGM(page);
   await recreateIdentityPacks();

   /**
    * The conversions the migration hides and keeps, and where the packed token is.
    * @type {{hidden: string[], ownId: string, packEntry: string, tokenId: string, unclaimedId: string}}
    */
   const ids = await page.evaluate(async ({ baseName, pack, sourceSceneName, tokenName }) => {
      /** @type {TitanActor} The world base actor of the token. */
      const base = await Actor.create({
         name: baseName,
         prototypeToken: { actorLink: false },
         type: 'npc',
      });

      /** @type {Scene} The world scene the packed scene is copied from. */
      const scene = await Scene.create({ name: sourceSceneName });

      /** @type {TokenDocument[]} The unlinked token, alone in the array. */
      const [token] = await scene.createEmbeddedDocuments('Token', [
         {
            actorId: base.id,
            actorLink: false,
            // Named apart from its base actor so core stores its delta at creation (#102).
            name: tokenName,
            x: 0,
            y: 0,
         },
      ]);

      /** @type {Item[]} Two Items the token removes, in the order core returns them (not the data's order). */
      const removedItems = await base.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Packed Removed Item',
            type: 'commodity',
         },
         {
            name: 'E2E Packed Removed Item (older conversion)',
            type: 'commodity',
         },
      ]);

      /** @type {Item} The removed Item whose conversion takes its id. */
      const removed = removedItems.find((item) => item.name === 'E2E Packed Removed Item');

      /** @type {Item} The removed Item whose conversion has another id (an older version's). */
      const removedOlder = removedItems.find((item) => item.name === 'E2E Packed Removed Item (older conversion)');

      // The token removes both inherited Items: its delta stores a tombstone for each.
      await token.actor.deleteEmbeddedDocuments('Item', [
         removed.id,
         removedOlder.id,
      ]);

      // The base actor converts them: one conversion takes its Item's id, one has another id (an older version's).
      await base.deleteEmbeddedDocuments('Item', [
         removed.id,
         removedOlder.id,
      ]);

      /** @type {string} The id of an Item the token converted itself. */
      const ownItemId = foundry.utils.randomID();

      /**
       * Builds the conversion stamp of an Item.
       * @param {string} itemId - The id of the converted Item the stamp names.
       * @returns {object} The effect's flags.
       */
      const stamp = (itemId) => ({
         titan: {
            convertedFromItem: itemId,
         },
      });

      /** @type {TitanActiveEffect[]} The base actor's conversions, in the order core returns them. */
      const conversions = await base.createEmbeddedDocuments('ActiveEffect', [
         {
            _id: removed.id,
            flags: stamp(removed.id),
            name: 'E2E Packed Converted Removed',
            type: 'effect',
         },
         {
            flags: stamp(removedOlder.id),
            name: 'E2E Packed Converted Removed (older id)',
            type: 'effect',
         },
         {
            flags: stamp(ownItemId),
            name: 'E2E Packed Converted Owned (older id)',
            type: 'effect',
         },
         {
            flags: stamp(foundry.utils.randomID()),
            name: 'E2E Packed Converted Unclaimed',
            type: 'effect',
         },
      ], { keepId: true });

      // The token holds its own conversion of the Item behind the third conversion above.
      await token.actor.createEmbeddedDocuments('ActiveEffect', [
         {
            _id: ownItemId,
            flags: stamp(ownItemId),
            name: 'E2E Packed Token Own Conversion',
            type: 'effect',
         },
      ], { keepId: true });

      /** @type {object} The world scene's data, its token's delta included. */
      const packedSceneData = scene.toObject();
      delete packedSceneData._id;
      packedSceneData.name = `${sourceSceneName} (packed)`;

      /** @type {Scene} The scene in the world Scene pack. */
      const packedScene = await Scene.create(packedSceneData, { pack: `world.${pack.name}` });

      // Only the packed copy is migrated: the world source scene is deleted and the pack is locked, as a GM keeps it.
      await scene.delete();
      await game.packs.get(`world.${pack.name}`).configure({ locked: true });

      /**
       * Reads the id of the conversion with the given name.
       * @param {string} name - The name the seed gave the conversion.
       * @returns {string} Its id.
       */
      const conversionId = (name) => conversions.find((effect) => effect.name === name).id;
      return {
         hidden: [
            conversionId('E2E Packed Converted Removed'),
            conversionId('E2E Packed Converted Removed (older id)'),
            conversionId('E2E Packed Converted Owned (older id)'),
         ],
         ownId: ownItemId,
         packEntry: packedScene.id,
         tokenId: packedScene.tokens.find((entry) => entry.name === tokenName).id,
         unclaimedId: conversionId('E2E Packed Converted Unclaimed'),
      };
   }, {
      baseName: PACK_BASE_NAME,
      pack: IDENTITY_PACKS.scene,
      sourceSceneName: PACK_SOURCE_SCENE_NAME,
      tokenName: HIDE_TOKEN_NAME,
   });

   /**
    * Reads the effects the packed token shows, its stored delta's effect and Item entries (tombstones marked), and
    * whether its pack is locked.
    * @returns {Promise<{effects: string[], items: string[], locked: boolean, shown: string[]}>} The sorted ids.
    */
   const readToken = () => page.evaluate(async ({ pack, packEntry, tokenId }) => {
      /** @type {CompendiumCollection} The world Scene pack. */
      const compendium = game.packs.get(`world.${pack.name}`);

      /** @type {TokenDocument} The packed scene's unlinked token. */
      const token = (await compendium.getDocument(packEntry)).tokens.get(tokenId);

      /**
       * Lists stored entries' ids, a tombstone's marked.
       * @param {object[]|undefined} entries - The stored entries.
       * @returns {string[]} The sorted ids.
       */
      const list = (entries) => (entries ?? [])
         .map((entry) => (entry._tombstone ? `${entry._id}:tombstone` : entry._id))
         .sort();
      return {
         effects: list(token._source.delta?.effects),
         items: list(token._source.delta?.items),
         locked: compendium.locked,
         shown: token.actor.effects.map((effect) => effect.id).sort(),
      };
   }, {
      ...ids,
      pack: IDENTITY_PACKS.scene,
   });

   /** @type {{effects: string[], items: string[], locked: boolean, shown: string[]}} The token before the migration. */
   const before = await readToken();

   // Presence first: the packed token shows every inherited conversion, and its delta stores the two Item tombstones.
   expect(before.shown).toEqual([
      ...ids.hidden,
      ids.ownId,
      ids.unclaimedId,
   ].sort());
   expect(before.effects).toEqual([ids.ownId]);
   expect(before.items).toHaveLength(2);
   expect(before.items.every((entry) => entry.endsWith(':tombstone'))).toBe(true);
   expect(before.locked).toBe(true);

   await reloadCapturingConsole('automatic');

   /** @type {{effects: string[], items: string[], locked: boolean, shown: string[]}} The token after the migration. */
   const migrated = await readToken();
   expect(migrated.shown).toEqual([
      ids.ownId,
      ids.unclaimedId,
   ].sort());
   expect(migrated.effects).toEqual([
      ids.ownId,
      ...ids.hidden.map((id) => `${id}:tombstone`),
   ].sort());
   expect(migrated.items).toEqual(before.items);
   expect(migrated.locked).toBe(true);
   expect(readUnlockLines(IDENTITY_PACKS.scene.label), 'the pass unlocked the Scene pack once').toHaveLength(1);

   // A second Automatic load finds nothing to hide and writes nothing: it never opens the packed token.
   await reloadCapturingConsole('automatic');
   expect(await readToken()).toEqual(migrated);
   expect(readUnlockLines(IDENTITY_PACKS.scene.label), 'the second load opened the packed token').toEqual([]);
});

test('an Automatic load hides the inherited conversions an Adventure token\'s own data claims, in the Adventure, once',
   async () => {
      test.setTimeout(300_000);
      await expectActiveGM(page);

      /**
       * The conversions the migration hides and keeps, and the ids of the Adventure and its documents.
       * @type {{actor: string, adventure: string, hidden: string[], ownId: string, scene: string, token: string,
       * unclaimedId: string}}
       */
      const ids = await page.evaluate(async ({ actorName, pack, sceneName }) => {
         await game.scenes.getName(sceneName)?.delete();
         await game.actors.getName(actorName)?.delete();

         /** @type {CompendiumCollection|undefined} An Adventure pack a previous test or run left. */
         const stalePack = game.packs.get(`world.${pack.name}`);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }
         await foundry.documents.collections.CompendiumCollection.createCompendium({
            label: pack.label,
            name: pack.name,
            type: pack.type,
         });

         /**
          * Builds the conversion stamp of an Item.
          * @param {string} itemId - The id of the converted Item the stamp names.
          * @returns {object} The effect's flags.
          */
         const stamp = (itemId) => ({
            titan: {
               convertedFromItem: itemId,
            },
         });

         // Fresh ids: an Adventure document whose id the world already holds is updated over it on import, not
         // created (Foundry v14 client/documents/adventure.mjs prepareImport).
         /** @type {Record<string, string>} The ids of the Adventure's documents, effects, and converted Items. */
         const fresh = {
            actor: foundry.utils.randomID(),
            olderOwned: foundry.utils.randomID(),
            olderRemoved: foundry.utils.randomID(),
            ownItem: foundry.utils.randomID(),
            removedItem: foundry.utils.randomID(),
            removedOlderItem: foundry.utils.randomID(),
            scene: foundry.utils.randomID(),
            token: foundry.utils.randomID(),
            unclaimed: foundry.utils.randomID(),
         };

         /** @type {Adventure} The Adventure in the world Adventure pack. */
         const created = await foundry.documents.Adventure.create({
            actors: [
               {
                  _id: fresh.actor,
                  effects: [
                     {
                        _id: fresh.removedItem,
                        flags: stamp(fresh.removedItem),
                        name: 'E2E Adventure Converted Removed',
                        type: 'effect',
                     },
                     {
                        _id: fresh.olderRemoved,
                        flags: stamp(fresh.removedOlderItem),
                        name: 'E2E Adventure Converted Removed (older id)',
                        type: 'effect',
                     },
                     {
                        _id: fresh.olderOwned,
                        flags: stamp(fresh.ownItem),
                        name: 'E2E Adventure Converted Owned (older id)',
                        type: 'effect',
                     },
                     {
                        _id: fresh.unclaimed,
                        flags: stamp(foundry.utils.randomID()),
                        name: 'E2E Adventure Converted Unclaimed',
                        type: 'effect',
                     },
                  ],
                  name: actorName,
                  prototypeToken: { actorLink: false },
                  type: 'npc',
               },
            ],
            name: 'E2E Identity Hide Adventure',
            scenes: [
               {
                  _id: fresh.scene,
                  name: sceneName,
                  tokens: [
                     {
                        _id: fresh.token,
                        actorId: fresh.actor,
                        actorLink: false,
                        delta: {
                           _id: fresh.token,
                           effects: [
                              {
                                 _id: fresh.ownItem,
                                 flags: stamp(fresh.ownItem),
                                 name: 'E2E Adventure Token Own Conversion',
                                 type: 'effect',
                              },
                           ],
                           items: [
                              {
                                 _id: fresh.removedItem,
                                 _tombstone: true,
                              },
                              {
                                 _id: fresh.removedOlderItem,
                                 _tombstone: true,
                              },
                           ],
                        },
                        name: 'E2E Hide Adventure Token',
                        x: 0,
                        y: 0,
                     },
                  ],
               },
            ],
         }, { pack: `world.${pack.name}` });

         // The pack is locked, as a GM keeps it: the walk unlocks it to migrate the Adventure and locks it again.
         await game.packs.get(`world.${pack.name}`).configure({ locked: true });
         return {
            actor: fresh.actor,
            adventure: created.id,
            hidden: [
               fresh.removedItem,
               fresh.olderRemoved,
               fresh.olderOwned,
            ],
            ownId: fresh.ownItem,
            scene: fresh.scene,
            token: fresh.token,
            unclaimedId: fresh.unclaimed,
         };
      }, {
         actorName: HIDE_ADVENTURE_ACTOR_NAME,
         pack: ADVENTURE_PACK,
         sceneName: HIDE_ADVENTURE_SCENE_NAME,
      });

      /**
       * Imports the Adventure, reads the effects its token shows in the world, then deletes the imported scene and
       * actor, so no world copy is left for a migrating load to walk.
       * @returns {Promise<string[]>} The sorted ids of the effects the imported token shows.
       */
      const readImportedShown = () => page.evaluate(async ({ actor, adventure: adventureId, pack, scene, token }) => {
         /** @type {Adventure} The packed Adventure, as a GM opening the pack loads it. */
         const adventure = await game.packs.get(`world.${pack.name}`).getDocument(adventureId);
         await adventure.import({ dialog: false });

         /** @type {string[]} The ids of the effects the imported token shows. */
         const shown = game.scenes.get(scene).tokens.get(token).actor.effects.map((effect) => effect.id).sort();
         await game.scenes.get(scene).delete();
         await game.actors.get(actor).delete();
         return shown;
      }, {
         ...ids,
         pack: ADVENTURE_PACK,
      });

      /**
       * Reads the Adventure token's stored delta effect and Item entries (tombstones marked) and whether the pack is
       * locked.
       * @returns {Promise<{effects: string[], items: string[], locked: boolean}>} The sorted ids, and the lock.
       */
      const readStored = () => page.evaluate(async ({ adventure: adventureId, pack, scene, token }) => {
         /** @type {CompendiumCollection} The world Adventure pack. */
         const compendium = game.packs.get(`world.${pack.name}`);

         /** @type {object} The Adventure's stored data. */
         const data = (await compendium.getDocument(adventureId)).toObject();

         /** @type {object|undefined} The token's stored delta. */
         const delta = data.scenes.find((entry) => entry._id === scene).tokens
            .find((entry) => entry._id === token).delta;

         /**
          * Lists stored entries' ids, a tombstone's marked.
          * @param {object[]|undefined} entries - The stored entries.
          * @returns {string[]} The sorted ids.
          */
         const list = (entries) => (entries ?? [])
            .map((entry) => (entry._tombstone ? `${entry._id}:tombstone` : entry._id))
            .sort();
         return {
            effects: list(delta?.effects),
            items: list(delta?.items),
            locked: compendium.locked,
         };
      }, {
         ...ids,
         pack: ADVENTURE_PACK,
      });

      // Presence first: imported as seeded, the token shows the three claimed conversions beside its own and the
      // unclaimed one, and the Adventure stores its own conversion and the two Item tombstones in a locked pack.
      expect(await readImportedShown()).toEqual([
         ...ids.hidden,
         ids.ownId,
         ids.unclaimedId,
      ].sort());

      /** @type {{effects: string[], items: string[], locked: boolean}} The Adventure token before the migration. */
      const before = await readStored();
      expect(before.effects).toEqual([ids.ownId]);
      expect(before.items).toHaveLength(2);
      expect(before.items.every((entry) => entry.endsWith(':tombstone'))).toBe(true);
      expect(before.locked).toBe(true);

      await reloadCapturingConsole('automatic');

      /** @type {{effects: string[], items: string[], locked: boolean}} The Adventure token after the migration. */
      const migrated = await readStored();
      expect(migrated.effects).toEqual([
         ids.ownId,
         ...ids.hidden.map((id) => `${id}:tombstone`),
      ].sort());
      expect(migrated.items).toEqual(before.items);
      expect(migrated.locked).toBe(true);
      expect(
         readUnlockLines(ADVENTURE_PACK.label),
         'only the token\'s location writes; the Adventure actor holds no work',
      ).toHaveLength(1);

      // A second Automatic load finds nothing to hide and writes nothing: it never opens the Adventure.
      await reloadCapturingConsole('automatic');
      expect(await readStored()).toEqual(migrated);
      expect(readUnlockLines(ADVENTURE_PACK.label), 'the second load opened the Adventure').toEqual([]);

      // Imported now, the token no longer shows the hidden conversions: its own and the unclaimed one remain.
      expect(await readImportedShown()).toEqual([
         ids.ownId,
         ids.unclaimedId,
      ].sort());
   });
