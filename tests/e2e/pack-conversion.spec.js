import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, closeAllApps } from './world.js';

/**
 * Pack effect-item conversion lock (safe plumbing): the every-load converter scans world Actor packs through a raw
 * index projection and must leave a clean pack completely untouched — no unlock, no writes, no errors. Deep
 * conversion (legacy items present) cannot be seeded at runtime because the 'effect' Item subtype is unregistered
 * and server-side validation rejects creation; that path is unit-covered
 * (tests/unit/ConvertEffectItemsToActiveEffects.test.js) and manually verified against a pre-conversion world copy.
 */

/** @type {string} The fixture pack's collection id (world-package compendium). */
const PACK_ID = 'world.e2e-pack-conversion';

/** @type {string} The fixture pack's manifest name. */
const PACK_NAME = 'e2e-pack-conversion';

/** @type {string} The fixture pack's display label. */
const PACK_LABEL = 'E2E Pack Conversion';

/** @type {string} Name of the clean packed fixture actor. */
const ACTOR_NAME = 'E2E Packed Clean Actor';

/** @type {string} The converter's completion log line (positive signal that the boot-path conversion finished). */
const CONVERTER_DONE_LINE = 'Conversion of legacy effect Items to Active Effects complete.';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;

/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/** @type {string[]} Console message texts collected on the shared page (survives reloads; cleared before reload). */
const consoleLines = [];

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   page.on('console', (message) => {
      consoleLines.push(message.text());
   });
   await login(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   // Remove the fixture pack so reruns and other files see a clean world (unlock first — the test locks it).
   await page?.evaluate(async (packId) => {
      /** @type {CompendiumCollection|undefined} The fixture pack, if it survived to teardown. */
      const pack = game.packs.get(packId);
      if (pack) {
         await pack.configure({ locked: false });
         await pack.deleteCompendium();
      }
   }, PACK_ID);
   await page?.close();
});

test.describe('pack effect-item conversion (clean-pack safety)', () => {
   test('boot-path converter leaves a clean locked world Actor pack untouched', async () => {
      // Precondition: the TITAN system must have initialized before any pack manipulation.
      /** @type {boolean} Whether the TITAN system finished initializing in the shared page. */
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize before the pack walk. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);

      // Remove any stale fixture pack from a prior run (unlocking it first), then seed a fresh locked pack
      // with one clean actor.
      await page.evaluate(async ({ packId, packName, packLabel, actorName }) => {
         /** @type {CompendiumCollection|undefined} A stale fixture pack left by a prior run, if any. */
         const stalePack = game.packs.get(packId);
         if (stalePack) {
            await stalePack.configure({ locked: false });
            await stalePack.deleteCompendium();
         }

         await foundry.documents.collections.CompendiumCollection.createCompendium({
            name: packName,
            label: packLabel,
            type: 'Actor',
         });

         // A clean actor with one modern item proves the index gate ignores non-legacy item types.
         await Actor.create(
            {
               name: actorName,
               type: 'player',
               items: [
                  {
                     name: 'E2E Packed Weapon',
                     type: 'weapon',
                  },
               ],
            },
            { pack: packId },
         );

         await game.packs.get(packId).configure({ locked: true });
      }, {
         packId: PACK_ID,
         packName: PACK_NAME,
         packLabel: PACK_LABEL,
         actorName: ACTOR_NAME,
      });

      // Reload: the every-load converter (including the pack scan) runs again on the boot path. NOTE: this is the
      // suite's FIRST mid-file reload of the shared page (a new harness idiom) — the waitForURL guard makes a lost
      // session fail crisply instead of timing out opaquely downstream.
      consoleLines.length = 0;
      await page.reload();
      await page.waitForURL('**/game', { timeout: 15_000 });
      await page.waitForFunction(() => globalThis.game?.ready === true && typeof game.titan !== 'undefined');

      // Positive completion signal first: the converter's finish line proves the boot-path conversion finished.
      await expect
         .poll(() => consoleLines.some((line) => line.includes(CONVERTER_DONE_LINE)), { timeout: 30_000 })
         .toBe(true);

      // Lock-state symmetry cannot distinguish "gate skipped" from "unlocked and re-locked", so assert the absence
      // of every per-pack line for the fixture: no conversion line, no per-pack failure, no failed lock-restore.
      expect(consoleLines.some((line) => line.includes(`in world pack "${PACK_LABEL}"`))).toBe(false);
      expect(consoleLines.some((line) => line.includes('Failed to convert legacy effect Items'))).toBe(false);
      expect(consoleLines.some((line) => line.includes('Failed to restore the lock'))).toBe(false);

      // The clean pack survived untouched: still locked, one entry, one modern item, zero Active Effects.
      /** @type {{locked: boolean, size: number, itemTypes: string[], effectCount: number}} Post-boot pack state. */
      const state = await page.evaluate(async (packId) => {
         /** @type {CompendiumCollection} The fixture pack after the reload boot. */
         const pack = game.packs.get(packId);

         /** @type {Collection<object>} The pack index with raw items and effects projected. */
         const index = await pack.getIndex({
            fields: [
               'items',
               'effects',
            ],
         });

         /** @type {object} The single packed actor's index entry. */
         const entry = index.contents[0];

         return {
            locked: pack.locked,
            size: index.size,
            itemTypes: entry.items.map((item) => item.type),
            effectCount: entry.effects?.length ?? 0,
         };
      }, PACK_ID);

      expect(state.locked).toBe(true);
      expect(state.size).toBe(1);
      expect(state.itemTypes).toEqual(['weapon']);
      expect(state.effectCount).toBe(0);
      expect(errors).toEqual([]);
   });
});
