import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { forceDice, resetDice } from './dice.js';
import { buildE2ERollerActorData, buildE2ERollerItemData } from '../shared/builders.js';
import { expectedCheckResults } from '../shared/checkOracle.js';
import {
   clickRoll,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setNumberField,
   setSelectField,
} from './checkDialog.js';

/**
 * 2b-3 checks-dialog: drive the rendered Svelte check-option dialog for all five check types. For
 * each, mutate option inputs and assert the displayed totals recompute, then Roll and assert the
 * produced chat message via the same independent oracle the 2b-2 bypass-API tests use. This proves the
 * dialog path (which the `roll<Type>Check` APIs skip) assembles, recomputes, and hands off correctly.
 */

// Forced faces; six entries cover the largest dice count in this spec (baseline 3 + diceMod 2 = 5).
const FORCED_FACES = [6, 5, 4, 3, 2, 1];

// The check types exercised by the uniform core test and their expected `flags.titan.type`.
const CORE_CASES = [
   { type: 'attribute', expectedType: 'attributeCheck' },
   { type: 'resistance', expectedType: 'resistanceCheck' },
   { type: 'attack', expectedType: 'attackCheck' },
   { type: 'casting', expectedType: 'castingCheck' },
   { type: 'item', expectedType: 'itemCheck' },
];

test.describe('v14 checks dialog (driven from Playwright)', () => {
   // Log in and (re)build the E2E Roller fixture before each test.
   test.beforeEach(async ({ page }) => {
      await login(page);

      // Precondition: the TITAN system must have initialized.
      const systemReady = await page.evaluate(() => typeof game.titan !== 'undefined'
         && !!CONFIG.Actor?.dataModels?.player);
      expect(systemReady, 'TITAN system failed to initialize before checks-dialog walk').toBe(true);

      // Rebuild the roller from the shared builder payloads for a clean, known fixture each run.
      await page.evaluate(async ({ actorData, itemData }) => {
         const stale = game.actors.getName('E2E Roller');
         if (stale) {
            await stale.delete();
         }
         const actor = await Actor.create(actorData);
         await actor.createEmbeddedDocuments('Item', itemData);
      }, { actorData: buildE2ERollerActorData(), itemData: buildE2ERollerItemData() });
   });

   // Restore the RNG, the dialog-gate setting, and close any leftover dialog windows after each test.
   test.afterEach(async ({ page }) => {
      await resetDice(page);
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
         const instances = foundry.applications?.instances;
         if (instances) {
            for (const app of instances.values()) {
               if (app?.element?.classList?.contains('titan-dialog')) {
                  await app.close();
               }
            }
         }
      });
   });

   for (const checkCase of CORE_CASES) {
      test(`${checkCase.type} dialog recomputes totals and rolls with mutated options`, async ({ page }) => {
         // Capture uncaught errors during the dialog + roll window.
         const errors = [];
         page.on('pageerror', (err) => {
            errors.push(err.message);
         });

         const dialog = await openCheckDialog(page, checkCase.type);

         // Baseline totals straight from the freshly opened dialog.
         const baseDice = await readSummary(dialog, 'totalDice');
         const baseExpertise = await readSummary(dialog, 'totalExpertise');
         expect(baseExpertise, 'baseline expertise is zero (untrained roller)').toBe(0);

         // (1) diceMod recompute: +2 dice.
         await setNumberField(dialog, 'diceMod', 2);
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice + 2));

         // (2) expertiseMod recompute: +3 expertise.
         await setNumberField(dialog, 'expertiseMod', 3);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText(String(baseExpertise + 3));

         // (3) doubleExpertise recompute: the displayed total doubles.
         await setCheckbox(dialog, 'doubleExpertise', true);
         await expect(dialog.getByTestId('check-summary-totalExpertise'))
            .toHaveText(String((baseExpertise + 3) * 2));

         // Reset expertise to zero so the rolled check satisfies the oracle's zero-expertise assumption.
         await setCheckbox(dialog, 'doubleExpertise', false);
         await setNumberField(dialog, 'expertiseMod', 0);
         await expect(dialog.getByTestId('check-summary-totalExpertise')).toHaveText('0');

         // diceMod stays at 2 → the rolled check should use baseDice + 2 dice.
         const rolledDice = baseDice + 2;
         await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(rolledDice));

         // (4) Roll handoff: force dice, roll, then read the produced message.
         await forceDice(page, FORCED_FACES);
         await clickRoll(dialog);
         const flags = await readNewestCheckFlags(page);

         // The right check type was produced.
         expect(flags.type, 'flags.titan.type').toBe(checkCase.expectedType);

         // The mutated options plumbed through: dice count reflects the dialog diceMod, expertise is zero.
         expect(flags.parameters.totalDice, 'rolled totalDice reflects dialog diceMod').toBe(rolledDice);
         expect(flags.parameters.totalExpertise, 'rolled totalExpertise is zero after reset').toBe(0);

         // Forced faces plumbed into the dice (sorted desc, truncated to the dice rolled).
         const consumedFaces = FORCED_FACES.slice(0, rolledDice).slice().sort((a, b) => b - a);
         expect(flags.results.dice.map((die) => die.base), 'rolled dice bases match forced faces')
            .toEqual(consumedFaces);
         expect(flags.results.dice.map((die) => die.final), 'finals equal bases at zero expertise')
            .toEqual(consumedFaces);

         // Results equal the independent oracle, exactly.
         const expected = expectedCheckResults(consumedFaces, {
            difficulty: flags.parameters.difficulty,
            complexity: flags.parameters.complexity,
            extraSuccessOnCritical: flags.parameters.extraSuccessOnCritical,
            extraFailureOnCritical: flags.parameters.extraFailureOnCritical,
         });
         expect(flags.results.successes, 'successes').toBe(expected.successes);
         expect(flags.results.criticalSuccesses, 'criticalSuccesses').toBe(expected.criticalSuccesses);
         expect(flags.results.criticalFailures, 'criticalFailures').toBe(expected.criticalFailures);
         expect(flags.results.succeeded, 'succeeded').toBe(expected.succeeded);
         expect(flags.results.extraSuccesses, 'extraSuccesses').toBe(expected.extraSuccesses);

         expect(errors, `uncaught errors during ${checkCase.type} dialog roll:\n${errors.join('\n')}`)
            .toEqual([]);
      });
   }

   // Attribute extra: the difficulty `<select>` changes the rolled difficulty without changing dice count.
   test('attribute dialog difficulty select flows through without changing dice', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      const dialog = await openCheckDialog(page, 'attribute');
      const baseDice = await readSummary(dialog, 'totalDice');

      // Difficulty is a 1-6 native select; changing it must not change the dice count.
      await setSelectField(dialog, 'difficulty', 6);
      await expect(dialog.getByTestId('check-summary-totalDice')).toHaveText(String(baseDice));

      // It must flow into the rolled difficulty.
      await forceDice(page, FORCED_FACES);
      await clickRoll(dialog);
      const flags = await readNewestCheckFlags(page);
      expect(flags.type, 'flags.titan.type').toBe('attributeCheck');
      expect(flags.parameters.difficulty, 'dialog difficulty select flows into rolled params').toBe(6);

      expect(errors, `uncaught errors during attribute difficulty test:\n${errors.join('\n')}`).toEqual([]);
   });

   // Attack extra: targetDefense set in the dialog flows into the rolled parameters and drives difficulty.
   test('attack dialog targetDefense flows into rolled parameters', async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => {
         errors.push(err.message);
      });

      const dialog = await openCheckDialog(page, 'attack');

      // A high targetDefense drives difficulty to its clamp ceiling (6); the raw value flows through.
      await setNumberField(dialog, 'targetDefense', 10);
      await forceDice(page, FORCED_FACES);
      await clickRoll(dialog);
      const flags = await readNewestCheckFlags(page);

      expect(flags.type, 'flags.titan.type').toBe('attackCheck');
      expect(flags.parameters.targetDefense, 'dialog targetDefense flows into rolled params').toBe(10);
      expect(flags.parameters.difficulty, 'high targetDefense clamps difficulty to the ceiling').toBe(6);

      expect(errors, `uncaught errors during attack targetDefense test:\n${errors.join('\n')}`).toEqual([]);
   });
});
