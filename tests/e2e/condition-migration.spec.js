import { expect, test } from '@playwright/test';
import { STORED_ACTOR_LOCATIONS } from '~/helpers/migration/StoredActorSources.js';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   closeAllApps,
   deleteFixtureActor,
   expectActiveGM,
   reloadWithMode,
} from './world.js';

/**
 * The stored-actor migration on a GM world load, in every location a stored actor lives (STORED_ACTOR_LOCATIONS): a
 * world actor, an unlinked token on a world scene, an actor in a world Actor pack, an unlinked token in a world Scene
 * pack, and an actor and an unlinked scene token in a world Adventure pack, every pack locked. The packs are created in
 * the test world at runtime (`CompendiumCollection.createCompendium`) and deleted afterwards. Each location holds a
 * condition in its v2.1.0 form (flat -1 rules elements and a stored description). Disabled leaves everything; Prompt
 * asks and leaves everything until confirmed; Automatic syncs the condition in every location and locks each pack
 * again; a second Automatic load writes nothing. Disabled and Prompt loads (the Prompt dialog dismissed) write nothing
 * and unlock no pack. The spec's GM must be the active GM, the one client that migrates, and each load asserts it.
 * No base-type Active Effect is seeded: TITAN registers only the `effect` and `condition` types, and a world actor
 * holding a base-type effect stops the world from loading.
 */

/** @type {string} The description text a condition created before this change stores in `flags.titan.description`. */
const LEGACY_DESCRIPTION = '<p>E2E legacy stored description</p>';

/** @type {string} Name of the world actor holding the seeded effects. */
const WORLD_ACTOR_NAME = 'E2E Migration World Actor';

/** @type {string} Name of the base actor of the unlinked tokens (on the world scene and in the packs). */
const TOKEN_ACTOR_NAME = 'E2E Migration Token Actor';

/** @type {string} Name of the world scene holding the unlinked token. */
const SCENE_NAME = 'E2E Migration Scene';

/**
 * The world packs the spec creates, each locked once seeded.
 * @type {Record<'actor'|'adventure'|'scene', {label: string, name: string, type: string}>}
 */
const PACKS = {
   actor: {
      label: 'E2E Migration Actors',
      name: 'e2e-migration-actors',
      type: 'Actor',
   },
   adventure: {
      label: 'E2E Migration Adventures',
      name: 'e2e-migration-adventures',
      type: 'Adventure',
   },
   scene: {
      label: 'E2E Migration Scenes',
      name: 'e2e-migration-scenes',
      type: 'Scene',
   },
};

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

/**
 * The effects seeded in every location, in their pre-migration forms: a Blinded condition with its v2.1.0 rules
 * elements and a stored description. Legacy effect Items cannot be seeded: the server rejects their unregistered
 * subtype.
 * @type {object[]}
 */
const SEED_EFFECTS = [
   {
      flags: {
         titan: {
            description: LEGACY_DESCRIPTION,
            type: 'condition',
         },
      },
      img: 'icons/svg/blind.svg',
      name: 'Blinded',
      statuses: ['blinded'],
      system: {
         rulesElement: STALE_BLINDED,
      },
      type: 'condition',
   },
];

/**
 * A location's seeded state: the Blinded condition stale and storing its description.
 * @type {object}
 */
const UNSYNCED = {
   blinded: {
      current: false,
      storesDescription: true,
   },
};

/**
 * A location's migrated state: the Blinded condition current with no stored description.
 * @type {object}
 */
const SYNCED = {
   blinded: {
      current: true,
      storesDescription: false,
   },
};

/** @type {Record<string, boolean>} Every spec pack locked. */
const ALL_LOCKED = {
   actor: true,
   adventure: true,
   scene: true,
};

/**
 * Builds the expected state of every location.
 * @param {object} summary - One location's expected state.
 * @returns {Record<string, object>} The state, keyed by location.
 */
function everyLocation(summary) {
   return Object.fromEntries(STORED_ACTOR_LOCATIONS.map((location) => [
      location,
      summary,
   ]));
}

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The migration mode in force before this spec. */
let originalMode;
/** @type {object} The ids of the seeded documents. */
let seeded;
/** @type {string[]} Console message texts collected on the shared page (survives reloads). */
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

test.afterAll(async () => {
   await page.evaluate(async ({ mode, packs, sceneName }) => {
      await game.settings.set('titan', 'migrationMode', mode);
      await game.scenes.getName(sceneName)?.delete();
      for (const { name } of Object.values(packs)) {
         /** @type {CompendiumCollection|undefined} A spec pack, if it exists. */
         const pack = game.packs.get(`world.${name}`);
         if (pack) {
            await pack.configure({ locked: false });
            await pack.deleteCompendium();
         }
      }
   }, {
      mode: originalMode,
      packs: PACKS,
      sceneName: SCENE_NAME,
   });
   await deleteFixtureActor(page, WORLD_ACTOR_NAME);
   await deleteFixtureActor(page, TOKEN_ACTOR_NAME);
   await page?.close();
});

/**
 * Seeds the effects in every location and locks the packs.
 * @returns {Promise<object>} The ids of the seeded documents.
 */
function seedStoredActors() {
   return page.evaluate(async ({ packs, sceneName, seedEffects, tokenActorName, worldActorName }) => {
      await game.actors.getName(worldActorName)?.delete();
      await game.actors.getName(tokenActorName)?.delete();
      await game.scenes.getName(sceneName)?.delete();
      for (const { name } of Object.values(packs)) {
         /** @type {CompendiumCollection|undefined} A pack a previous run left. */
         const stalePack = game.packs.get(`world.${name}`);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }
      }
      for (const { label, name, type } of Object.values(packs)) {
         await foundry.documents.collections.CompendiumCollection.createCompendium({
            label,
            name,
            type,
         });
      }

      /** @type {TitanActor} The world actor, holding the seeded effects itself. */
      const worldActor = await Actor.create({
         name: worldActorName,
         type: 'player',
      });
      await worldActor.createEmbeddedDocuments('ActiveEffect', seedEffects);

      /** @type {TitanActor} The base actor of the unlinked tokens. */
      const tokenActor = await Actor.create({
         name: tokenActorName,
         prototypeToken: { actorLink: false },
         type: 'npc',
      });

      /** @type {Scene} The world scene. */
      const scene = await Scene.create({ name: sceneName });

      /** @type {TokenDocument[]} The unlinked token, alone in the array. */
      const [token] = await scene.createEmbeddedDocuments('Token', [
         {
            actorId: tokenActor.id,
            actorLink: false,
            name: tokenActorName,
            x: 0,
            y: 0,
         },
      ]);
      await token.actor.createEmbeddedDocuments('ActiveEffect', seedEffects);

      /** @type {TitanActor} The actor in the world Actor pack. */
      const packedActor = await Actor.create({
         effects: seedEffects,
         name: 'E2E Migration Packed Actor',
         type: 'npc',
      }, { pack: `world.${packs.actor.name}` });

      // A copy of the world scene in the Scene pack: its unlinked token's delta holds the seeded effects, and its
      // base actor is the world token actor.
      /** @type {object} The world scene's data, its token's delta included. */
      const packedSceneData = scene.toObject();
      delete packedSceneData._id;
      packedSceneData.name = 'E2E Migration Packed Scene';

      /** @type {Scene} The scene in the world Scene pack. */
      const packedScene = await Scene.create(packedSceneData, { pack: `world.${packs.scene.name}` });

      // An Adventure holding a copy of the packed actor and of the world scene.
      /** @type {object} The Adventure actor's data. */
      const adventureActor = packedActor.toObject();
      adventureActor.name = 'E2E Migration Adventure Actor';

      /** @type {object} The Adventure scene's data. */
      const adventureScene = scene.toObject();
      adventureScene.name = 'E2E Migration Adventure Scene';

      /** @type {Adventure} The Adventure in the world Adventure pack. */
      const adventure = await foundry.documents.Adventure.create({
         actors: [adventureActor],
         name: 'E2E Migration Adventure',
         scenes: [adventureScene],
      }, { pack: `world.${packs.adventure.name}` });

      for (const { name } of Object.values(packs)) {
         await game.packs.get(`world.${name}`).configure({ locked: true });
      }
      return {
         actorPackEntry: packedActor.id,
         adventureEntry: adventure.id,
         sceneId: scene.id,
         scenePackEntry: packedScene.id,
         tokenId: token.id,
      };
   }, {
      packs: PACKS,
      sceneName: SCENE_NAME,
      seedEffects: SEED_EFFECTS,
      tokenActorName: TOKEN_ACTOR_NAME,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * Reads, in every location, the seeded effects' state, the packs' locks, and the last modification times the
 * migration would change.
 * @returns {Promise<{locked: object, summaries: object, times: object}>} The packs' locks, each location's summary,
 * and the modification times.
 */
function readState() {
   return page.evaluate(async ({ entries, packs, worldActorName }) => {
      /** @type {object} Blinded's CONFIG.statusEffects entry, whose rules elements are current. */
      const blindedDefinition = CONFIG.statusEffects.find((condition) => condition.id === 'blinded');

      /**
       * Summarizes the seeded effects among one location's stored Active Effect data.
       * @param {object[]|undefined} effects - The stored Active Effect data.
       * @returns {{summary: object, time: number|null}} The seeded effects' state, and the Blinded condition's last
       * modification time.
       */
      const summarize = (effects) => {
         /** @type {object[]} The effects, tombstones excluded. */
         const live = (effects ?? []).filter((effect) => !effect._tombstone);

         /** @type {object|undefined} The Blinded condition effect. */
         const blinded = live.find((effect) => effect.type === 'condition' && effect.statuses?.length === 1
            && effect.statuses[0] === 'blinded');
         return {
            summary: {
               blinded: {
                  current: foundry.utils.equals(blinded?.system?.rulesElement ?? null,
                     blindedDefinition.system.rulesElement),
                  storesDescription: blinded?.flags?.titan?.description !== undefined,
               },
            },
            time: blinded?._stats?.modifiedTime ?? null,
         };
      };

      /** @type {CompendiumCollection} The world Actor pack. */
      const actorPack = game.packs.get(`world.${packs.actor.name}`);

      /** @type {CompendiumCollection} The world Scene pack. */
      const scenePack = game.packs.get(`world.${packs.scene.name}`);

      /** @type {CompendiumCollection} The world Adventure pack. */
      const adventurePack = game.packs.get(`world.${packs.adventure.name}`);

      /** @type {object} The packed scene's data. */
      const packedScene = (await scenePack.getDocument(entries.scenePackEntry)).toObject();

      /** @type {Adventure} The packed Adventure. */
      const adventure = await adventurePack.getDocument(entries.adventureEntry);

      /** @type {object} The packed Adventure's data. */
      const adventureData = adventure.toObject();

      /** @type {TokenDocument} The unlinked token on the world scene. */
      const token = game.scenes.get(entries.sceneId).tokens.get(entries.tokenId);

      /** @type {Record<string, {summary: object, time: number|null}>} Each location's state. */
      const locations = {
         actorPack: summarize((await actorPack.getDocument(entries.actorPackEntry)).toObject().effects),
         adventureActor: summarize(adventureData.actors[0].effects),
         adventureSceneToken: summarize(adventureData.scenes[0].tokens[0].delta?.effects),
         sceneToken: summarize(token._source.delta?.effects),
         scenePackToken: summarize(packedScene.tokens[0].delta?.effects),
         worldActor: summarize(game.actors.getName(worldActorName)._source.effects),
      };
      return {
         locked: {
            actor: actorPack.locked,
            adventure: adventurePack.locked,
            scene: scenePack.locked,
         },
         summaries: Object.fromEntries(Object.entries(locations).map(([location, state]) => [
            location,
            state.summary,
         ])),
         times: {
            actorPack: locations.actorPack.time,
            adventure: adventure._stats.modifiedTime,
            sceneToken: locations.sceneToken.time,
            scenePackToken: locations.scenePackToken.time,
            worldActor: locations.worldActor.time,
         },
      };
   }, {
      entries: seeded,
      packs: PACKS,
      worldActorName: WORLD_ACTOR_NAME,
   });
}

/**
 * Asserts that the load just finished wrote nothing and unlocked no pack: every seeded stored actor holds its seeded
 * state with its seeded modification time, every spec pack is locked, and the console shows no spec-pack unlock line.
 * The capture is first shown to hold this load's lines (the system's start-up line), so the missing unlock line is an
 * absence on a capture whose presence is proven.
 * @param {{locked: object, summaries: object, times: object}} seededState - The state read right after seeding.
 * @returns {Promise<void>}
 */
async function expectNothingWritten(seededState) {
   expect(consoleLines.some((line) => line.includes('TITAN | Starting Titan VTTRPG System')), 'this load is captured')
      .toBe(true);

   /** @type {{locked: object, summaries: object, times: object}} The state after the load. */
   const state = await readState();
   expect(state.summaries).toEqual(seededState.summaries);
   expect(state.times).toEqual(seededState.times);
   expect(state.locked).toEqual(ALL_LOCKED);
   expect(consoleLines.filter((line) => line.includes('Unlocked world pack "E2E Migration'))).toEqual([]);
}

test('Disabled and Prompt leave every stored actor; Automatic migrates each location once', async () => {
   test.setTimeout(300_000);
   seeded = await seedStoredActors();

   /** @type {{locked: object, summaries: object, times: object}} The state before any reload. */
   const seededState = await readState();
   expect(seededState.summaries).toEqual(everyLocation(UNSYNCED));
   expect(seededState.locked).toEqual(ALL_LOCKED);

   // Disabled: the load wrote nothing and unlocked no pack. That it also reads nothing (Disabled resolves before the
   // scan) is gated by tests/unit/OnceReady.test.js ("scans and converts nothing in Disabled mode").
   consoleLines.length = 0;
   await reloadWithMode(page, 'disabled');
   await expectNothingWritten(seededState);

   // Prompt: the migration dialog asks first; the load writes nothing before the GM confirms, and dismissing the
   // dialog writes nothing.
   consoleLines.length = 0;
   await reloadWithMode(page, 'prompt');

   /** @type {string} The migration dialog's localized description. */
   const promptText = await page.evaluate(() => game.i18n.localize('LOCAL.confirmMigrateWorld.desc.text'));
   await expect(page.locator('.application.titan-dialog').filter({ hasText: promptText })).toBeVisible();
   await closeAllApps(page);
   await expectNothingWritten(seededState);

   // Automatic: every location migrates, and each pack is unlocked to write it and locked again.
   consoleLines.length = 0;
   await reloadWithMode(page, 'automatic');

   /** @type {{locked: object, summaries: object, times: object}} The migrated state. */
   const migrated = await readState();
   expect(migrated.summaries).toEqual(everyLocation(SYNCED));
   expect(migrated.locked).toEqual(ALL_LOCKED);
   for (const { label } of Object.values(PACKS)) {
      expect(consoleLines.some((line) => line.includes(`Unlocked world pack "${label}"`)), label).toBe(true);
   }
   for (const [location, time] of Object.entries(migrated.times)) {
      expect(time, location).toEqual(expect.any(Number));
   }

   // A second Automatic load finds nothing to write: no spec pack is unlocked (each was on the load above) and no
   // seeded effect or Adventure is modified.
   consoleLines.length = 0;
   await reloadWithMode(page, 'automatic');

   /** @type {{locked: object, summaries: object, times: object}} The state after the second load. */
   const again = await readState();
   expect(again.summaries).toEqual(everyLocation(SYNCED));
   expect(again.times).toEqual(migrated.times);
   expect(consoleLines.filter((line) => line.includes('Unlocked world pack "E2E Migration'))).toEqual([]);
});

test('an Adventure write a hook vetoes counts as failed, and the migration does not announce completion', async () => {
   test.setTimeout(300_000);
   seeded = await seedStoredActors();

   /** @type {{locked: object, summaries: object, times: object}} The state before any reload. */
   const seededState = await readState();
   expect(seededState.summaries).toEqual(everyLocation(UNSYNCED));

   consoleLines.length = 0;
   await reloadWithMode(page, 'prompt');

   /** @type {{description: string, migrate: string}} The migration dialog's description and confirm label. */
   const labels = await page.evaluate(() => ({
      description: game.i18n.localize('LOCAL.confirmMigrateWorld.desc.text'),
      migrate: game.i18n.localize('LOCAL.migrateWorld.text'),
   }));

   /** @type {import('@playwright/test').Locator} The migration dialog. */
   const dialog = page.locator('.application.titan-dialog').filter({ hasText: labels.description });
   await expect(dialog).toBeVisible();

   // A preUpdateAdventure hook returning false vetoes every Adventure write on this client; core then resolves the
   // update to undefined without throwing (client/data/client-backend.mjs #preUpdateDocumentArray).
   await page.evaluate(() => {
      globalThis.__titanAdventureVeto = Hooks.on('preUpdateAdventure', () => false);
   });
   consoleLines.length = 0;
   await dialog.getByRole('button', {
      exact: true,
      name: labels.migrate,
   }).click();

   // A confirmed migration is a full pass over every location and pack: a multi-second operation, like a world load.
   await expect.poll(() => consoleLines.find((line) => line.startsWith('TITAN | World migration')) ?? null, {
      message: 'the confirmed migration finished',
      timeout: 60_000,
   }).toBe('TITAN | World migration finished with failures: 2.');
   await page.evaluate(() => {
      Hooks.off('preUpdateAdventure', globalThis.__titanAdventureVeto);
      delete globalThis.__titanAdventureVeto;
   });

   /** @type {{locked: object, summaries: object, times: object}} The state after the confirmed migration. */
   const state = await readState();
   expect(state.summaries).toEqual({
      ...everyLocation(SYNCED),
      adventureActor: UNSYNCED,
      adventureSceneToken: UNSYNCED,
   });
   expect(state.times.adventure).toBe(seededState.times.adventure);
   expect(state.locked).toEqual(ALL_LOCKED);
   for (const name of [
      'E2E Migration Adventures: E2E Migration Adventure: E2E Migration Adventure Actor',
      `E2E Migration Adventures: E2E Migration Adventure: E2E Migration Adventure Scene: ${TOKEN_ACTOR_NAME}`,
   ]) {
      expect(consoleLines.some((line) => line.includes(`Failed to migrate the stored actor "${name}"`)), name)
         .toBe(true);
   }
});
