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
 * @returns {Promise<import('@playwright/test').Locator>} The open dialog.
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

   // The row is a flex row whose details use the small font token.
   /** @type {{detailsFontSize: string, display: string, flexDirection: string, smallFontSize: string}} Row styles. */
   const styles = await row.evaluate((element) => {
      /** @type {HTMLSpanElement} A probe resolving the small font token to computed px form. */
      const probe = document.createElement('span');
      probe.style.fontSize = 'var(--titan-font-size-small)';
      element.appendChild(probe);

      /** @type {string} The resolved small font size. */
      const smallFontSize = getComputedStyle(probe).fontSize;
      probe.remove();
      return {
         detailsFontSize: getComputedStyle(element.querySelector('.details')).fontSize,
         display: getComputedStyle(element).display,
         flexDirection: getComputedStyle(element).flexDirection,
         smallFontSize,
      };
   });
   expect(styles.display).toBe('flex');
   expect(styles.flexDirection).toBe('row');
   expect(styles.detailsFontSize).toBe(styles.smallFontSize);

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
   await expect(dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: 'Strong Current' }))
      .toContainText('E2E Strong Current');
});
