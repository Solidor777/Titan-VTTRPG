import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps } from './world.js';

/**
 * Item-check damage-reduction propagation: when an item check carries damage plus a damage-reducing
 * opposed (or resistance) check, the ROLLED item-check chat message's `system.parameters` must carry
 * that configuration. This regression-guards a fix where `getItemCheckParameters` previously dropped
 * `isDamage`, dropped `opposedCheck.enabled`, and stuck `damageReducedBy` at `'none'`.
 *
 * Confirmed against source (src/document/types/actor/types/character/CharacterDataModel.js
 * `getItemCheckParameters`): the function now copies `checkData.isDamage`/`isHealing`, rebuilds the
 * `opposedCheck` object including its `enabled` flag, and sets `parameters.damageReducedBy` when
 * `damageReducedBy === 'opposedCheck'` and the opposed check is enabled, or `'resistanceCheck'` and the
 * resistance is not `'none'`. Valid resistances (src/system/Resistances.js): reflexes/resilience/willpower.
 *
 * Read path: the rolled message is a first-class `itemCheck` ChatMessage subtype, so its data lives at
 * `message.system.parameters` (mirrors how tests/e2e/checks-opposed.spec.js reads `newest.system.parameters`).
 * The ability item is built with a fully populated `check[]` entry mirroring createItemCheckTemplate()
 * (src/check/types/item-check/ItemCheckTemplate.js) — omitting fields like `opposedCheck` makes
 * `getItemCheckParameters` throw when it reads `checkData.opposedCheck.enabled`.
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

test.describe('item-check damage-reduction propagation', () => {
   // The world name of the purpose-built roller actor used as the check source.
   const ACTOR_NAME = 'E2E ItemCheck Reducer';

   /**
    * Builds a complete item-check `check[]` entry, mirroring createItemCheckTemplate() defaults, with the
    * supplied overrides merged in. Inlined here because the template module is not importable in the page
    * context, and every field must be present or getItemCheckParameters throws.
    * @param {object} overrides - Fields to override on the base template (shallow-merged at top level).
    * @returns {object} A fully populated item-check entry suitable for the ability's `system.check[]`.
    */
   function buildItemCheck(overrides) {
      // The base template defaults (1:1 with createItemCheckTemplate()), spread under the overrides.
      return {
         attribute: 'body',
         complexity: 1,
         damageReducedBy: 'none',
         difficulty: 4,
         initialValue: 1,
         isDamage: false,
         isHealing: false,
         label: 'E2E Reduction Check',
         opposedCheck: {
            attribute: 'body',
            enabled: false,
            skill: 'athletics',
         },
         resistanceCheck: 'none',
         resolveCost: 0,
         scaling: true,
         skill: 'arcana',
         uuid: 'e2e0dada-e2e0-4dad-8dad-e2e0e2e0dada',
         ...overrides,
      };
   }

   /**
    * Rebuilds the roller actor carrying a single ability whose `check[0]` is the supplied item-check entry,
    * rolls that check (dialog-bypassing API), and returns the rolled message's `system.parameters`.
    * @param {object} itemCheck - The fully populated item-check entry to seed as the ability's `check[0]`.
    * @returns {Promise<{created: boolean, parameters: object}>} Creation flag and the rolled parameters.
    */
   async function rollItemCheckWith(itemCheck) {
      return page.evaluate(async ({ actorName, check }) => {
         // Remove any stale roller so each run starts from a clean, known fixture.
         const stale = game.actors.getName(actorName);
         if (stale) {
            await stale.delete();
         }

         // The purpose-built, Gamemaster-owned player actor used as the roll source.
         const actor = await Actor.create({ name: actorName, type: 'player' });

         // The ability item carrying the single configured item-check entry.
         await actor.createEmbeddedDocuments('Item', [
            {
               name: 'E2E Reduction Ability',
               type: 'ability',
               system: {
                  check: [check],
               },
            },
         ]);

         // Roll the ability's check (index 0) through the dialog-bypassing API and await the new message.
         const abilityId = actor.items.find((item) => item.type === 'ability').id;
         const before = game.messages.size;
         await actor.system.rollItemCheck({ itemId: abilityId, checkIdx: 0 });
         await titanWait(() => game.messages.size > before, { message: 'new item-check chat message' });

         // The rolled item-check message is a first-class subtype; its config lives in system.parameters.
         const newest = game.messages.contents[game.messages.size - 1];
         return {
            created: game.messages.size > before,
            parameters: newest?.system?.parameters,
         };
      }, { actorName: ACTOR_NAME, check: itemCheck });
   }

   // Precondition: the TITAN system must have initialized before any roll path can be exercised.
   test.beforeEach(async () => {
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(
         systemReady,
         `TITAN system failed to initialize. Captured page errors:\n${errors.join('\n')}`,
      ).toBe(true);
   });

   test('opposed-reduction item check propagates isDamage, opposedCheck.enabled, and damageReducedBy', async () => {
      // A damaging item check whose damage is reduced by an enabled opposed check.
      const result = await rollItemCheckWith(buildItemCheck({
         damageReducedBy: 'opposedCheck',
         initialValue: 3,
         isDamage: true,
         opposedCheck: {
            attribute: 'body',
            enabled: true,
            skill: 'athletics',
         },
      }));

      // The roll must have produced a message carrying parameters.
      expect(result.created, 'an item-check message was created').toBe(true);
      expect(result.parameters, 'rolled message carries system.parameters').toBeTruthy();

      // All three were dropped before the fix: the damage flag, the opposed-enabled flag, and the
      // damage-reduction source.
      expect(result.parameters.isDamage, 'isDamage propagated from the check config').toBe(true);
      expect(result.parameters.opposedCheck.enabled, 'opposedCheck.enabled propagated').toBe(true);
      expect(result.parameters.damageReducedBy, 'damageReducedBy carries the opposed source')
         .toBe('opposedCheck');

      // No uncaught errors may have fired during the roll.
      expect(errors, `uncaught errors during opposed-reduction roll:\n${errors.join('\n')}`).toEqual([]);
   });

   test('resistance-reduction item check propagates damageReducedBy', async () => {
      // A damaging item check whose damage is reduced by a (non-'none') resistance check.
      const result = await rollItemCheckWith(buildItemCheck({
         damageReducedBy: 'resistanceCheck',
         initialValue: 3,
         isDamage: true,
         resistanceCheck: 'resilience',
      }));

      // The roll must have produced a message carrying parameters.
      expect(result.created, 'an item-check message was created').toBe(true);
      expect(result.parameters, 'rolled message carries system.parameters').toBeTruthy();

      // damageReducedBy was stuck at 'none' before the fix; it must now carry the resistance source.
      expect(result.parameters.isDamage, 'isDamage propagated from the check config').toBe(true);
      expect(result.parameters.damageReducedBy, 'damageReducedBy carries the resistance source')
         .toBe('resistanceCheck');
      expect(result.parameters.resistanceCheck, 'the configured resistance propagated')
         .toBe('resilience');

      // No uncaught errors may have fired during the roll.
      expect(errors, `uncaught errors during resistance-reduction roll:\n${errors.join('\n')}`).toEqual([]);
   });
});
