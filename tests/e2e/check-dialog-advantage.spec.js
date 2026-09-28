import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { forceDice, resetDice } from './dice.js';
import { buildE2ERollerActorData, buildE2ERollerItemData } from '../shared/builders.js';
import {
   clickRoll,
   openCheckDialog,
   readNewestCheckFlags,
   readSummary,
   setCheckbox,
   setSelectField,
} from './checkDialog.js';

/**
 * The check dialog's Advantage select, Automatic Failure checkbox, effective Difficulty, and situational checkboxes.
 */

/** @type {string} Name of the throwaway player actor carrying a situational modifier. */
const ACTOR_NAME = 'E2E Dialog Advantage Actor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

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
   await resetDice(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async () => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
   });
   await deleteFixtureActor(page, ACTOR_NAME);
   await deleteFixtureActor(page, 'E2E Roller');
   await page?.close();
});

/**
 * Rebuilds the spec's actor with one "Underwater" situation (Disadvantage) and opens its Attribute Check dialog under
 * the situational setting.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog's window-root locator, already visible.
 */
async function openSituationalDialog() {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Deep Water',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Underwater',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-dialog-underwater',
                     value: -1,
                  },
               ],
            },
         },
      ]);
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   return dialog;
}

test('every check dialog offers Advantage, Automatic Failure, and the effective Difficulty', async () => {
   await page.evaluate(async ({ actorData, itemData }) => {
      await game.actors.getName('E2E Roller')?.delete();

      /** @type {TitanActor} The rebuilt E2E Roller. */
      const actor = await Actor.create(actorData);
      await actor.createEmbeddedDocuments('Item', itemData);
   }, {
      actorData: buildE2ERollerActorData(),
      itemData: buildE2ERollerItemData(),
   });

   for (const type of [
      'attribute',
      'resistance',
      'attack',
      'casting',
      'item',
   ]) {
      /** @type {import('@playwright/test').Locator} The open dialog of this check type. */
      const dialog = await openCheckDialog(page, type);
      await expect(dialog.getByTestId('check-field-advantage')).toBeVisible();
      await expect(dialog.getByTestId('check-field-automaticFailure')).toBeVisible();
      await expect(dialog.getByTestId('check-summary-difficulty')).toBeVisible();
      await closeAllApps(page);
   }
});

test('the Advantage select and a ticked situation change the displayed and rolled Difficulty', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();

   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');
   await expect(difficulty).toHaveText('4');

   // The situation row lists its label, what it does, and its source; its check icon tracks the tick.
   /** @type {import('@playwright/test').Locator} The Underwater situation row. */
   const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
   await expect(row).toContainText('E2E Deep Water');

   /** @type {import('@playwright/test').Locator} The row's checkbox. */
   const toggle = row.locator('[data-testid^="situation-toggle-"]');
   await toggle.click();
   await expect(row.locator('i.fa-check')).toHaveCount(1);
   await expect(difficulty).toHaveText('5');
   await toggle.click();
   await expect(row.locator('i.fa-check')).toHaveCount(0);
   await expect(difficulty).toHaveText('4');
   await toggle.click();
   await expect(difficulty).toHaveText('5');

   // Greater Advantage from the select nets +1 against the ticked Disadvantage.
   await setSelectField(dialog, 'advantage', 2);
   await expect(difficulty).toHaveText('3');
   expect(await readSummary(dialog, 'difficulty')).toBe(3);

   // The row is a flex row whose details use the small font token, and its checkbox matches the dialog's other
   // input fields' height (CheckDialogField's own `.input` override), not the smaller global default.
   /**
    * @type {{checkboxHeight: string, detailsFontSize: string, display: string, fieldInputHeight: string,
    * flexDirection: string, smallFontSize: string}} Row and checkbox styles.
    */
   const styles = await row.evaluate((element) => {
      /** @type {HTMLSpanElement} A probe resolving the small font token to computed px form. */
      const probe = document.createElement('span');
      probe.style.fontSize = 'var(--titan-font-size-small)';
      element.appendChild(probe);

      /** @type {string} The resolved small font size. */
      const smallFontSize = getComputedStyle(probe).fontSize;
      probe.remove();
      return {
         checkboxHeight: getComputedStyle(element.querySelector('button')).height,
         detailsFontSize: getComputedStyle(element.querySelector('.details')).fontSize,
         display: getComputedStyle(element).display,
         flexDirection: getComputedStyle(element).flexDirection,
         smallFontSize,
      };
   });
   /** @type {string} The dialog's other fields' input height (CheckDialogField's `.input` override), for reference. */
   const fieldInputHeight = await dialog.getByTestId('check-field-diceMod').locator('input').evaluate(
      (element) => getComputedStyle(element).height,
   );
   expect(styles.display).toBe('flex');
   expect(styles.flexDirection).toBe('row');
   expect(styles.detailsFontSize).toBe(styles.smallFontSize);
   expect(styles.checkboxHeight).toBe(fieldInputHeight);
   // Also pin the resolved value itself, not just the two sides' equality, so a change to the shared
   // --titan-check-dialog-input-height token would fail this test rather than silently moving both sides together.
   expect(styles.checkboxHeight).toBe('28px');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters).toMatchObject({
      advantage: 1,
      baseDifficulty: 4,
      difficulty: 3,
      situations: [
         {
            key: 'underwater',
            label: 'Underwater',
         },
      ],
   });
});

test('the Automatic Failure checkbox fails the rolled check', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();
   await setCheckbox(dialog, 'automaticFailure', true);
   await forceDice(page, [6]);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.automaticFailure).toBe(true);

   // The forced die actually rolled a 6 (a Success against Difficulty 4 without Automatic Failure), so the zero
   // Successes below is a real automatic-failure transition, not an accidental zero.
   expect(flags.results.dice.some((die) => die.final === 6)).toBe(true);
   expect(flags.results.successes).toBe(0);
});

test('the open dialog follows the Actor\'s effects', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();

   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');

   /** @type {import('@playwright/test').Locator} The Underwater situation row. */
   const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
   await row.locator('[data-testid^="situation-toggle-"]').click();
   await expect(difficulty).toHaveText('5');

   // Deleting the effect behind the ticked situation removes its row and its Disadvantage from the open dialog.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Deep Water').delete();
   }, ACTOR_NAME);
   await expect(row).toHaveCount(0);
   await expect(difficulty).toHaveText('4');

   // A new situational effect appears in the same open dialog.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Strong Current',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Strong Current',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-dialog-strong-current',
                     value: -1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   /** @type {import('@playwright/test').Locator} The new Strong Current situation row. */
   const strongCurrentRow = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Strong Current' });
   await expect(strongCurrentRow).toContainText('E2E Strong Current');

   // A brand new situation (a different key from the one just removed) starts unticked and does not affect the
   // Difficulty. This does NOT guard a same-key reuse — see the dedicated test below for that.
   await expect(strongCurrentRow.locator('i.fa-check')).toHaveCount(0);
   await expect(difficulty).toHaveText('4');
});

test('a ticked situation does not survive its row\'s removal onto a same-key situation', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openSituationalDialog();

   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');

   /** @type {import('@playwright/test').Locator} The Underwater situation row. */
   const row = dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Underwater' });
   await row.locator('[data-testid^="situation-toggle-"]').click();
   await expect(row.locator('i.fa-check')).toHaveCount(1);
   await expect(difficulty).toHaveText('5');

   // Deleting the effect behind the ticked situation removes its row (presence→absence).
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Deep Water').delete();
   }, ACTOR_NAME);
   await expect(row).toHaveCount(0);
   await expect(difficulty).toHaveText('4');

   // A different effect that resolves to the SAME situation key ("underwater") must start unticked, not inherit
   // the tick left behind in options.situations by the deleted effect's row.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Deep Water 2',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'Underwater',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'situation',
                     skill: '',
                     uuid: 'e2e-dialog-underwater-2',
                     value: -1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(row).toHaveCount(1);
   await expect(row.locator('i.fa-check')).toHaveCount(0);
   await expect(difficulty).toHaveText('4');
});

/**
 * Rebuilds the spec's actor plain (no effects) and opens its Attribute Check dialog under the "always" setting.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog's window-root locator, already visible.
 */
async function openAlwaysDialog() {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor, with no effects yet. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   return dialog;
}

test('Advantage follows an always-on Actor effect, presence→absence, and the rolled check carries the ' +
   're-derived value', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openAlwaysDialog();

   /** @type {import('@playwright/test').Locator} The Advantage select's trigger. */
   const advantageSelect = dialog.getByTestId('check-field-advantage').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');
   await expect(difficulty).toHaveText('4');
   await expect(advantageSelect).toHaveAttribute('data-value', '0');

   // An always-on Disadvantage effect (selector "any", not a situation, so never offered as a checkbox) is added
   // while the dialog is open: the select and the effective Difficulty follow it.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Disadvantage',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-disadvantage',
                     value: -1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(advantageSelect).toHaveAttribute('data-value', '-1');
   await expect(difficulty).toHaveText('5');

   // Rolling now carries the re-derived value, not the stale value the dialog opened with (m4).
   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.advantage).toBe(-1);
   expect(flags.parameters.difficulty).toBe(5);
});

test('Advantage follows removing an always-on Actor effect (presence→absence on the same locator)', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openAlwaysDialog();

   /** @type {import('@playwright/test').Locator} The Advantage select's trigger. */
   const advantageSelect = dialog.getByTestId('check-field-advantage').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');

   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Disadvantage',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-disadvantage-remove',
                     value: -1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(advantageSelect).toHaveAttribute('data-value', '-1');
   await expect(difficulty).toHaveText('5');

   // Removing the effect returns both to their prior state (presence→absence on the same locators).
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Always Disadvantage').delete();
   }, ACTOR_NAME);
   await expect(advantageSelect).toHaveAttribute('data-value', '0');
   await expect(difficulty).toHaveText('4');
});

test('Advantage keeps a user override against a later always-on Actor effect (synced on a visible Total ' +
   'Dice change)', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openAlwaysDialog();

   /** @type {import('@playwright/test').Locator} The Advantage select's trigger. */
   const advantageSelect = dialog.getByTestId('check-field-advantage').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The effective-Difficulty summary. */
   const difficulty = dialog.getByTestId('check-summary-difficulty');
   /** @type {import('@playwright/test').Locator} The Total Dice summary. */
   const totalDice = dialog.getByTestId('check-summary-totalDice');
   /** @type {number} The Total Dice before any effect is added. */
   const baselineDice = await readSummary(dialog, 'totalDice');

   // The user picks Greater Advantage in the dialog.
   await setSelectField(dialog, 'advantage', 2);
   await expect(advantageSelect).toHaveAttribute('data-value', '2');
   await expect(difficulty).toHaveText('2');

   // A further always-on effect carries BOTH a Disadvantage modifier (which must not overwrite the user's
   // Advantage) and a Dice modifier (a visible, untouched field). Waiting for the Dice change first proves this
   // effect was actually processed by the re-derivation pass before asserting Advantage held its ground — an
   // effect that silently failed to run would make the "still 2" assertion pass for the wrong reason.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Disadvantage And Dice',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'advantage',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-disadvantage-sync',
                     value: -1,
                  },
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-dice-sync',
                     value: 3,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(totalDice).toHaveText(String(baselineDice + 3));

   // Only now, having proven the effect was processed, assert the user's Advantage choice survived it.
   await expect(advantageSelect).toHaveAttribute('data-value', '2');
   await expect(difficulty).toHaveText('2');
});

test('Automatic Failure follows an always-on Actor effect, presence→absence, presence again', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openAlwaysDialog();

   /** @type {import('@playwright/test').Locator} The Automatic Failure field wrapper. */
   const field = dialog.getByTestId('check-field-automaticFailure');
   await expect(field.locator('i.fa-check')).toHaveCount(0);

   // An always-on Automatic Failure effect is added while the dialog is open: the checkbox follows it (absence→
   // presence).
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Auto-Fail',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'automaticFailure',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-autofail',
                     value: 1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(field.locator('i.fa-check')).toHaveCount(1);

   // I5's remove leg: deleting it before the user edits anything ticks it back off (presence→absence on the same
   // subject), proving the follow behavior works in both directions, not only add.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Always Auto-Fail').delete();
   }, ACTOR_NAME);
   await expect(field.locator('i.fa-check')).toHaveCount(0);

   // Re-adding it ticks it back on (absence→presence a second time), confirming the follow behavior isn't a
   // one-shot fluke of the first add.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Auto-Fail',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'automaticFailure',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-autofail-readd',
                     value: 1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(field.locator('i.fa-check')).toHaveCount(1);
});

test('Automatic Failure keeps a user override against a later always-on Actor effect (synced on a ' +
   'visible Total Dice change)', async () => {
   /** @type {import('@playwright/test').Locator} The open Attribute Check dialog. */
   const dialog = await openAlwaysDialog();

   /** @type {import('@playwright/test').Locator} The Automatic Failure field wrapper. */
   const field = dialog.getByTestId('check-field-automaticFailure');
   /** @type {import('@playwright/test').Locator} The Total Dice summary. */
   const totalDice = dialog.getByTestId('check-summary-totalDice');
   /** @type {number} The Total Dice before any effect is added. */
   const baselineDice = await readSummary(dialog, 'totalDice');

   // An always-on effect ticks the checkbox on; the user unticks it (an override against the live derivation).
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Auto-Fail',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'automaticFailure',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-autofail-3',
                     value: 1,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(field.locator('i.fa-check')).toHaveCount(1);
   await setCheckbox(dialog, 'automaticFailure', false);
   await expect(field.locator('i.fa-check')).toHaveCount(0);

   // A further always-on effect carries both another Automatic Failure source (which must not re-tick the
   // checkbox) and a Dice modifier (a visible, untouched field). Waiting for the Dice change first proves this
   // effect was actually processed before asserting the checkbox held its override.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Always Auto-Fail And Dice',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'automaticFailure',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-autofail-sync',
                     value: 1,
                  },
                  {
                     checkType: 'any',
                     key: '',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'any',
                     skill: '',
                     uuid: 'e2e-dialog-always-dice-sync-2',
                     value: 3,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(totalDice).toHaveText(String(baselineDice + 3));

   // Only now, having proven the effect was processed, assert the user's override survived it.
   await expect(field.locator('i.fa-check')).toHaveCount(0);
});

test('an untouched derived field re-derives immediately when the user changes a derivation input (Skill)', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor, with a Skill-narrowed always-on Dice modifier. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Athletics Dice Boost',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'athletics',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'skill',
                     skill: '',
                     uuid: 'e2e-dialog-skill-dice',
                     value: 2,
                  },
               ],
            },
         },
      ]);
      await actor.system.requestAttributeCheck({ attribute: 'body' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open dialog. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The diceMod field's number input. */
   const diceModField = dialog.getByTestId('check-field-diceMod').locator('input');
   await expect(diceModField).toHaveValue('0');

   // Setting the Skill to Athletics narrows the always-on Dice modifier onto this check. diceMod is untouched, so
   // it re-derives immediately from the check-options change alone — no Actor mutation is involved in this step.
   await setSelectField(dialog, 'skill', 'athletics');
   await expect(diceModField).toHaveValue('2');
});

test('a caller-supplied override survives dialog mount and rolls with its value', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });

      // requestAttributeCheck's raw options carry an explicit diceMod: 3, which must survive dialog mount (I3)
      // rather than being overwritten by the first re-derivation pass (diceMod is otherwise actor-derived).
      await actor.system.requestAttributeCheck({
         attribute: 'body',
         diceMod: 3,
      });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open dialog. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The diceMod field's number input. */
   const diceModField = dialog.getByTestId('check-field-diceMod').locator('input');
   await expect(diceModField).toHaveValue('3');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.diceMod).toBe(3);
});

test('Attacker Melee follows an always-on rating-modifier Actor effect (presence→absence on the same ' +
   'locator)', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Attack Weapon',
            type: 'weapon',
         },
      ]);

      /** @type {TitanItem} The default weapon, whose default attack is Melee. */
      const weapon = actor.items.find((item) => item.type === 'weapon');
      await actor.system.requestAttackCheck({
         attackIdx: 0,
         itemId: weapon.id,
      });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open Attack Check dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]');
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Melee field's number input. */
   const meleeField = dialog.getByTestId('check-field-attackerMelee').locator('input');
   /** @type {string} The Melee rating before any rating-modifier effect is added. */
   const baselineMelee = await meleeField.inputValue();

   // An always-on conditionalRatingModifier effect (applies to every Melee attack, "attackType"/"melee") is added
   // while the dialog is open: the untouched Melee field follows it.
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Melee Rating Boost',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     key: 'melee',
                     operation: 'conditionalRatingModifier',
                     rating: 'melee',
                     selector: 'attackType',
                     uuid: 'e2e-dialog-melee-rating-boost',
                     value: 2,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
   await expect(meleeField).toHaveValue(String(Number(baselineMelee) + 2));

   // Removing the effect returns Melee to its prior value (presence→absence on the same locator).
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).effects.getName('E2E Melee Rating Boost').delete();
   }, ACTOR_NAME);
   await expect(meleeField).toHaveValue(baselineMelee);
});

test('untouched owned-weapon-derived Attack fields (Type, with dialog UI; Cleave, without) follow an edit to the ' +
   'owned weapon\'s attack, and the rolled check carries the re-derived values', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Attack Weapon',
            type: 'weapon',
         },
      ]);

      /** @type {TitanItem} The default weapon, whose default attack is Melee with no traits. */
      const weapon = actor.items.find((item) => item.type === 'weapon');
      await actor.system.requestAttackCheck({
         attackIdx: 0,
         itemId: weapon.id,
      });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open Attack Check dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]');
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Type select's trigger. */
   const typeSelect = dialog.getByTestId('check-field-type').locator('[role="combobox"]');
   await expect(typeSelect).toHaveAttribute('data-value', 'melee');
   await expect(dialog.getByTestId('check-field-attackerMelee')).toBeVisible();

   // Flip the owned weapon's default attack from Melee to Ranged (a value transition, visible via both the Type
   // select and the Melee/Accuracy field swap this Shell drives directly off checkOptions.type) and add the Cleave
   // trait (no dialog UI — Cleave has none, so it is only observable on the rolled check's parameters below). Both
   // fields are untouched, so both follow.
   await page.evaluate(async (actorName) => {
      const actor = game.actors.getName(actorName);
      const weapon = actor.items.find((item) => item.type === 'weapon');
      const attacks = foundry.utils.deepClone(weapon.system.attack);
      attacks[0].type = 'ranged';
      attacks[0].trait = [
         {
            name: 'cleave',
            value: true,
         },
      ];
      await weapon.update({
         system: {
            attack: attacks,
         },
      });
   }, ACTOR_NAME);
   await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
   await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.type).toBe('ranged');
   expect(flags.parameters.cleave).toBe(true);
});

test('a user-set Attack Type is kept against a later owned-weapon edit to its Type (synced on the untouched ' +
   'Attribute)', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Attack Weapon',
            type: 'weapon',
         },
      ]);

      /** @type {TitanItem} The default weapon, whose default attack is Melee. */
      const weapon = actor.items.find((item) => item.type === 'weapon');
      await actor.system.requestAttackCheck({
         attackIdx: 0,
         itemId: weapon.id,
      });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open Attack Check dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-attack-check-dialog-"]');
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Type select's trigger. */
   const typeSelect = dialog.getByTestId('check-field-type').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The Attribute select's trigger. */
   const attributeSelect = dialog.getByTestId('check-field-attribute').locator('[role="combobox"]');
   await expect(attributeSelect).toHaveAttribute('data-value', 'body');

   // The user picks Ranged explicitly in the dialog.
   await setSelectField(dialog, 'type', 'ranged');
   await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
   await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();

   // Two real edits to the weapon's attack: to Ranged, then back to Melee with a Mind Attribute. The second edit
   // would set an untouched Type to Melee; the Attribute is untouched and derived from the attack, so it follows.
   await page.evaluate(async (actorName) => {
      const weapon = game.actors.getName(actorName).items.find((item) => item.type === 'weapon');

      /** @type {object[]} The weapon's attacks, edited in two updates. */
      const attacks = foundry.utils.deepClone(weapon.system.attack);
      attacks[0].type = 'ranged';
      await weapon.update({
         system: {
            attack: attacks,
         },
      });
      attacks[0].type = 'melee';
      attacks[0].attribute = 'mind';
      await weapon.update({
         system: {
            attack: attacks,
         },
      });
   }, ACTOR_NAME);

   // The Attribute's change proves the second edit was processed before the user's Type is asserted.
   await expect(attributeSelect).toHaveAttribute('data-value', 'mind');
   await expect(typeSelect).toHaveAttribute('data-value', 'ranged');
   await expect(dialog.getByTestId('check-field-attackerAccuracy')).toBeVisible();
});

/**
 * Rebuilds the spec's actor with the E2E Roller's owned weapon, spell, and ability (whose one check is Body/Arcana,
 * Difficulty 4, Complexity 1) and opens the Check dialog of the given type for the owned item of the given type.
 * @param {string} checkType - The check type: attack, casting, or item.
 * @param {string} itemType - The owned item's type: weapon, spell, or ability.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog's window-root locator, already visible.
 */
async function openOwnedItemDialog(checkType, itemType) {
   await page.evaluate(async ({ actorName, itemData, kind, method }) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', itemData);

      /** @type {TitanItem} The owned item whose check the dialog rolls. */
      const item = actor.items.find((owned) => owned.type === kind);
      await actor.system[method]({
         attackIdx: 0,
         checkIdx: 0,
         itemId: item.id,
      });
   }, {
      actorName: ACTOR_NAME,
      itemData: buildE2ERollerItemData(),
      kind: itemType,
      method: `request${checkType[0].toUpperCase()}${checkType.slice(1)}Check`,
   });

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(`.application.titan-dialog[id^="titan-${checkType}-check-dialog-"]`);
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Edits the first check of the spec actor's owned ability.
 * @param {object} changes - The check fields to change.
 * @returns {Promise<void>}
 */
async function editAbilityCheck(changes) {
   await page.evaluate(async ({ actorName, changes: fields }) => {
      const ability = game.actors.getName(actorName).items.find((item) => item.type === 'ability');

      /** @type {object[]} The ability's checks, with the first one edited. */
      const checks = foundry.utils.deepClone(ability.system.check);
      Object.assign(checks[0], fields);
      await ability.update({
         system: {
            check: checks,
         },
      });
   }, {
      actorName: ACTOR_NAME,
      changes,
   });
}

test('an untouched Item Check Difficulty and Skill follow an edit to the owned item\'s check, and the rolled ' +
   'check carries them', async () => {
   /** @type {import('@playwright/test').Locator} The open Item Check dialog. */
   const dialog = await openOwnedItemDialog('item', 'ability');

   /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
   const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The Skill select's trigger. */
   const skillSelect = dialog.getByTestId('check-field-skill').locator('[role="combobox"]');
   await expect(difficultySelect).toHaveAttribute('data-value', '4');
   await expect(skillSelect).toHaveAttribute('data-value', 'arcana');

   await editAbilityCheck({
      difficulty: 5,
      skill: 'athletics',
   });
   await expect(difficultySelect).toHaveAttribute('data-value', '5');
   await expect(skillSelect).toHaveAttribute('data-value', 'athletics');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.difficulty).toBe(5);
   expect(flags.parameters.skill).toBe('athletics');
});

test('a user-set Skill is kept against a later edit to the owned item\'s check (synced on the untouched ' +
   'Difficulty)', async () => {
   /** @type {import('@playwright/test').Locator} The open Item Check dialog. */
   const dialog = await openOwnedItemDialog('item', 'ability');

   /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
   const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The Skill select's trigger. */
   const skillSelect = dialog.getByTestId('check-field-skill').locator('[role="combobox"]');
   await expect(difficultySelect).toHaveAttribute('data-value', '4');

   // The user picks Athletics; the item's check then moves to Melee Weapons, which an untouched Skill would follow.
   await setSelectField(dialog, 'skill', 'athletics');
   await expect(skillSelect).toHaveAttribute('data-value', 'athletics');
   await editAbilityCheck({
      difficulty: 5,
      skill: 'meleeWeapons',
   });

   // The Difficulty's change proves the edit was processed before the user's Skill is asserted.
   await expect(difficultySelect).toHaveAttribute('data-value', '5');
   await expect(skillSelect).toHaveAttribute('data-value', 'athletics');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.skill).toBe('athletics');
});

test('Skill "None" on a Skill-opened Attribute Check keeps the displayed Attribute until a real Skill supplies ' +
   'one', async () => {
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor, with an always-on Dice modifier for Arcana Checks. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Arcana Dice Boost',
            type: 'effect',
            system: {
               rulesElement: [
                  {
                     checkType: 'any',
                     key: 'arcana',
                     modifierType: 'dice',
                     operation: 'conditionalCheckModifier',
                     selector: 'skill',
                     skill: '',
                     uuid: 'e2e-dialog-arcana-dice',
                     value: 2,
                  },
               ],
            },
         },
      ]);

      // Opened from Arcana, so the Attribute comes from the Skill's default (Mind).
      await actor.system.requestAttributeCheck({ skill: 'arcana' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The open dialog. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();

   /** @type {import('@playwright/test').Locator} The Attribute select's trigger. */
   const attributeSelect = dialog.getByTestId('check-field-attribute').locator('[role="combobox"]');
   /** @type {import('@playwright/test').Locator} The diceMod field's number input. */
   const diceModField = dialog.getByTestId('check-field-diceMod').locator('input');
   await expect(attributeSelect).toHaveAttribute('data-value', 'mind');
   await expect(diceModField).toHaveValue('2');

   // Skill "None" leaves the Attribute without a source; the Arcana Dice modifier stops applying, which proves the
   // options were rebuilt before the Attribute is asserted.
   await setSelectField(dialog, 'skill', 'none');
   await expect(diceModField).toHaveValue('0');
   await expect(attributeSelect).toHaveAttribute('data-value', 'mind');

   // A real Skill supplies the Attribute again.
   await setSelectField(dialog, 'skill', 'athletics');
   await expect(attributeSelect).toHaveAttribute('data-value', 'body');
});

for (const [checkType, itemType] of [
   [
      'attack',
      'weapon',
   ],
   [
      'casting',
      'spell',
   ],
   [
      'item',
      'ability',
   ],
]) {
   test(`deleting the owned ${itemType} while its ${checkType} dialog is open closes the dialog without a page ` +
      'error', async () => {
      /** @type {import('@playwright/test').Locator} The open dialog. */
      const dialog = await openOwnedItemDialog(checkType, itemType);

      await page.evaluate(async ({ actorName, kind }) => {
         await game.actors.getName(actorName).items.find((item) => item.type === kind).delete();
      }, {
         actorName: ACTOR_NAME,
         kind: itemType,
      });
      await expect(dialog).toHaveCount(0);
      expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   });
}

/** @type {string} Label of the spec actor's effect check, shown on its roll button in the effect row. */
const EFFECT_CHECK_LABEL = 'E2E Dialog Effect Check';

/**
 * Rebuilds the spec's actor with one effect carrying a Body/Arcana, Difficulty 4 check, then opens that check's
 * dialog from the character sheet's effect row (the effect-sourced caller).
 * @returns {Promise<import('@playwright/test').Locator>} The Item Check dialog's window-root locator, already visible.
 */
async function openEffectCheckDialog() {
   /** @type {string} The rebuilt effect's ID. */
   const effectId = await page.evaluate(async ({ actorName, label }) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });

      // One COMPLETE check entry, mirroring createItemCheckTemplate().
      const [effect] = await actor.createEmbeddedDocuments('ActiveEffect', [
         {
            name: 'E2E Dialog Check Effect',
            type: 'effect',
            system: {
               check: [
                  {
                     attribute: 'body',
                     complexity: 1,
                     damageReducedBy: 'none',
                     difficulty: 4,
                     initialValue: 1,
                     isDamage: false,
                     isHealing: false,
                     label,
                     opposedCheck: {
                        attribute: 'body',
                        enabled: false,
                        skill: 'athletics',
                     },
                     resistanceCheck: 'none',
                     resolveCost: 0,
                     scaling: true,
                     skill: 'arcana',
                     uuid: 'e2e-dialog-effect-check',
                  },
               ],
            },
         },
      ]);
      await actor.sheet.render(true);
      return effect.id;
   }, {
      actorName: ACTOR_NAME,
      label: EFFECT_CHECK_LABEL,
   });

   /** @type {import('@playwright/test').Locator} The character sheet. */
   const sheet = page.locator('.application.titan-document-sheet');
   await expect(sheet).toBeVisible();
   await sheet.getByText('Effects', { exact: true }).first().click();

   /** @type {import('@playwright/test').Locator} The effect's row, expanded to show its check. */
   const row = sheet.locator(`[data-effect-id="${effectId}"]`);
   await expect(row).toBeVisible();
   await row.locator('.header .label .button button').first().click();
   await row.getByRole('button').filter({ hasText: EFFECT_CHECK_LABEL }).first().click();

   /** @type {import('@playwright/test').Locator} The Item Check dialog. */
   const dialog = page.locator('.application.titan-dialog[id^="titan-item-check-dialog-"]');
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Edits or deletes the spec actor's check effect.
 * @param {object|undefined} changes - The check fields to change, or undefined to delete the effect.
 * @returns {Promise<void>}
 */
async function changeCheckEffect(changes) {
   await page.evaluate(async ({ actorName, changes: fields }) => {
      const effect = game.actors.getName(actorName).effects.getName('E2E Dialog Check Effect');
      if (!fields) {
         await effect.delete();
         return;
      }

      /** @type {object[]} The effect's checks, with the first one edited. */
      const checks = foundry.utils.deepClone(effect.system.check);
      Object.assign(checks[0], fields);
      await effect.update({
         system: {
            check: checks,
         },
      });
   }, {
      actorName: ACTOR_NAME,
      changes,
   });
}

test('an effect-sourced Item Check dialog\'s untouched Difficulty follows an edit to the effect\'s check, and the ' +
   'rolled check carries it', async () => {
   /** @type {import('@playwright/test').Locator} The open Item Check dialog. */
   const dialog = await openEffectCheckDialog();

   /** @type {import('@playwright/test').Locator} The Difficulty select's trigger. */
   const difficultySelect = dialog.getByTestId('check-field-difficulty').locator('[role="combobox"]');
   await expect(difficultySelect).toHaveAttribute('data-value', '4');

   await changeCheckEffect({ difficulty: 5 });
   await expect(difficultySelect).toHaveAttribute('data-value', '5');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.difficulty).toBe(5);
});

test('deleting the effect while its Item Check dialog is open closes the dialog without a page error', async () => {
   /** @type {import('@playwright/test').Locator} The open Item Check dialog. */
   const dialog = await openEffectCheckDialog();

   await changeCheckEffect(undefined);
   await expect(dialog).toHaveCount(0);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
});
