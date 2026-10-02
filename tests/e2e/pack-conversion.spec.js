import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import {
   attachPageErrors,
   closeAllApps,
   expectActiveGM,
   reloadWithMode,
} from './world.js';

/**
 * The boot migration's world-pack gate: an Automatic GM load that finds a stale actor in a locked world Actor pack
 * unlocks that pack to migrate it and locks it again, and leaves a clean locked world Actor pack untouched: never
 * unlocked, never written. The stale actor carries a Blinded condition in its v2.1.0 form (flat -1 rules elements and
 * a stored description); legacy effect Items cannot be seeded at runtime (the server rejects their unregistered
 * `effect` subtype) and are unit-covered (tests/unit/ConvertEffectItemsToActiveEffects.test.js,
 * tests/unit/StoredActorSources.test.js). Both packs are read from stored data (`_source`): an embedded collection
 * omits invalid documents, so it cannot show what is stored. The spec's GM must be the active GM, the one client that
 * migrates, and each load asserts it.
 */

/** @type {{label: string, name: string}} The clean fixture pack. */
const CLEAN_PACK = {
   label: 'E2E Clean Pack',
   name: 'e2e-clean-pack',
};

/** @type {{label: string, name: string}} The stale fixture pack. */
const STALE_PACK = {
   label: 'E2E Stale Pack',
   name: 'e2e-stale-pack',
};

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {string} The migration mode in force before this spec. */
let originalMode;
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
   originalMode = await page.evaluate(() => game.settings.get('titan', 'migrationMode'));
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   try {
      await page?.evaluate(async ({ mode, names }) => {
         await game.settings.set('titan', 'migrationMode', mode);
         for (const name of names) {
            /** @type {CompendiumCollection|undefined} A fixture pack, if it survived. */
            const pack = game?.packs?.get(`world.${name}`);
            if (pack) {
               await pack.configure({ locked: false });
               await pack.deleteCompendium();
            }
         }
      }, {
         mode: originalMode,
         names: [
            CLEAN_PACK.name,
            STALE_PACK.name,
         ],
      });
   }
   finally {
      await page?.close();
   }
});

test('an Automatic load migrates a stale locked pack and never unlocks or writes a clean one', async () => {
   test.setTimeout(120_000);

   /**
    * The seeded actors, and how many stored effects of the stale one hold a description.
    * @type {{cleanActorId: string, cleanModifiedTime: number, staleActorId: string, staleDescriptions: number}}
    */
   const seeded = await page.evaluate(async ({ clean, stale }) => {
      for (const { name } of [
         clean,
         stale,
      ]) {
         /** @type {CompendiumCollection|undefined} A fixture pack a previous run left. */
         const existing = game.packs.get(`world.${name}`);
         if (existing) {
            await existing.configure({ locked: false });
            await existing.deleteCompendium();
         }
      }
      for (const { label, name } of [
         clean,
         stale,
      ]) {
         await foundry.documents.collections.CompendiumCollection.createCompendium({
            label,
            name,
            type: 'Actor',
         });
      }

      /** @type {TitanActor} A clean actor with one modern Item. */
      const cleanActor = await Actor.create({
         items: [
            {
               name: 'E2E Packed Weapon',
               type: 'weapon',
            },
         ],
         name: 'E2E Packed Clean Actor',
         type: 'player',
      }, { pack: `world.${clean.name}` });

      /** @type {TitanActor} A stale actor holding a Blinded condition in its v2.1.0 form. */
      const staleActor = await Actor.create({
         effects: [
            {
               flags: {
                  titan: {
                     description: '<p>E2E legacy stored description</p>',
                     type: 'condition',
                  },
               },
               img: 'icons/svg/blind.svg',
               name: 'Blinded',
               statuses: ['blinded'],
               system: {
                  rulesElement: [
                     'melee',
                     'accuracy',
                     'defense',
                  ].map((key) => ({
                     key,
                     operation: 'flatModifier',
                     selector: 'rating',
                     uuid: `condition-blinded-${key}`,
                     value: -1,
                  })),
               },
               type: 'condition',
            },
         ],
         name: 'E2E Packed Stale Actor',
         type: 'npc',
      }, { pack: `world.${stale.name}` });
      for (const { name } of [
         clean,
         stale,
      ]) {
         await game.packs.get(`world.${name}`).configure({ locked: true });
      }
      return {
         cleanActorId: cleanActor.id,
         cleanModifiedTime: cleanActor._stats.modifiedTime,
         staleActorId: staleActor.id,
         staleDescriptions: staleActor._source.effects
            .filter((effect) => effect.flags?.titan?.description !== undefined).length,
      };
   }, {
      clean: CLEAN_PACK,
      stale: STALE_PACK,
   });

   expect(seeded.staleDescriptions).toBe(1);

   consoleLines.length = 0;
   await reloadWithMode(page, 'automatic');

   // Presence: the migration reached the world packs and unlocked the stale one to write it.
   expect(consoleLines.some((line) => line.includes(`Unlocked world pack "${STALE_PACK.label}"`))).toBe(true);

   /** @type {{clean: object, stale: object}} Both packs' state after the load. */
   const state = await page.evaluate(async ({ cleanActorId, cleanName, staleActorId, staleName }) => {
      /** @type {CompendiumCollection} The pack seeded with nothing to migrate. */
      const cleanPack = game.packs.get(`world.${cleanName}`);

      /** @type {CompendiumCollection} The pack seeded with a stale condition. */
      const stalePack = game.packs.get(`world.${staleName}`);

      /** @type {TitanActor} The clean pack's actor, loaded after the reload. */
      const cleanActor = await cleanPack.getDocument(cleanActorId);

      /** @type {TitanActor} The stale pack's actor, loaded after the reload. */
      const staleActor = await stalePack.getDocument(staleActorId);

      /** @type {object[]} The stale actor's stored Active Effect data. */
      const staleEffects = staleActor._source.effects;

      /** @type {object[]} Blinded's current rules elements. */
      const blindedElements = CONFIG.statusEffects.find((condition) => condition.id === 'blinded').system.rulesElement;
      return {
         clean: {
            effectCount: cleanActor._source.effects.length,
            itemTypes: cleanActor._source.items.map((item) => item.type),
            locked: cleanPack.locked,
            modifiedTime: cleanActor._stats.modifiedTime,
         },
         stale: {
            current: staleEffects.every((effect) => foundry.utils.equals(effect.system?.rulesElement ?? null,
               blindedElements)),
            descriptions: staleEffects.filter((effect) => effect.flags?.titan?.description !== undefined).length,
            effectCount: staleEffects.length,
            locked: stalePack.locked,
         },
      };
   }, {
      cleanActorId: seeded.cleanActorId,
      cleanName: CLEAN_PACK.name,
      staleActorId: seeded.staleActorId,
      staleName: STALE_PACK.name,
   });
   expect(state.stale).toEqual({
      current: true,
      descriptions: 0,
      effectCount: 1,
      locked: true,
   });

   // Absence, after the presence above in the same load: the clean pack was never unlocked or written.
   expect(consoleLines.some((line) => line.includes(`"${CLEAN_PACK.label}"`))).toBe(false);
   expect(state.clean).toEqual({
      effectCount: 0,
      itemTypes: ['weapon'],
      locked: true,
      modifiedTime: seeded.cleanModifiedTime,
   });
   expect(errors).toEqual([]);
});
