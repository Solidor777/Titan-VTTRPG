import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { clickRoll, readNewestCheckFlags, setSelectField } from './checkDialog.js';

/**
 * Equipped Heavy, Encumbering, and Loud armor offer their check rules as situational modifiers: Heavy's Greater
 * Disadvantage to Swim, Fly, or Climb and its Jump Automatic Failure on Athletics checks only, and Loud's Disadvantage
 * to remain undetected on Stealth checks only.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Armor Trait Actor';

/** @type {string} Name of the armor item seeded for this spec. */
const ARMOR_NAME = 'E2E Trait Armor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{jump: string, swim: string, undetected: string}} The localized situation labels. */
let labels;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   labels = await page.evaluate(() => ({
      jump: game.i18n.localize('LOCAL.situationJump.text'),
      swim: game.i18n.localize('LOCAL.situationSwimFlyClimb.text'),
      undetected: game.i18n.localize('LOCAL.situationRemainUndetectedByHearing.text'),
   }));
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

/**
 * Rebuilds the actor wearing one armor with the given traits, under the situational dialog setting.
 * @param {string[]} traits - The armor's trait names.
 * @returns {Promise<void>} Resolves once the armor is equipped.
 */
async function seedArmoredActor(traits) {
   await page.evaluate(async ({ actorName, armorName, armorTraits }) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.actors.getName(actorName)?.delete();

      /** @type {TitanActor} The rebuilt actor. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });

      /** @type {TitanItem[]} The created armor, alone in the array. */
      const [armor] = await actor.createEmbeddedDocuments('Item', [
         {
            name: armorName,
            type: 'armor',
            system: {
               trait: armorTraits.map((name) => ({
                  name,
                  value: true,
               })),
            },
         },
      ]);
      await actor.system.equipArmor(armor.id);
   }, {
      actorName: ACTOR_NAME,
      armorName: ARMOR_NAME,
      armorTraits: traits,
   });
}

/**
 * Requests an Athletics check for the actor and returns its open dialog.
 * @returns {Promise<import('@playwright/test').Locator>} The dialog window.
 */
async function openAthleticsDialog() {
   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).system.requestAttributeCheck({ skill: 'athletics' });
   }, ACTOR_NAME);

   /** @type {import('@playwright/test').Locator} The dialog window. */
   const dialog = page.locator(DIALOG_SELECTOR);
   await expect(dialog).toBeVisible();
   return dialog;
}

/**
 * Locates a situation row in a dialog by its label.
 * @param {import('@playwright/test').Locator} dialog - The dialog window.
 * @param {string} label - The situation label.
 * @returns {import('@playwright/test').Locator} The row.
 */
function situationRow(dialog, label) {
   return dialog.locator('[data-testid^="situation-row-"]').filter({ hasText: label });
}

test('Heavy armor offers Jump and Swim, Fly, or Climb only on Athletics checks', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();

   /** @type {import('@playwright/test').Locator} The Jump situation row. */
   const jump = situationRow(dialog, labels.jump);

   /** @type {import('@playwright/test').Locator} The Swim, Fly, or Climb situation row. */
   const swim = situationRow(dialog, labels.swim);
   await expect(jump).toBeVisible();
   await expect(swim).toBeVisible();

   // Swim, Fly, or Climb starts unticked: the Difficulty is the base 4.
   await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('4');

   // A Dexterity check offers neither Athletics-narrowed situation.
   await setSelectField(dialog, 'skill', 'dexterity');
   await expect(jump).toHaveCount(0);
   await expect(swim).toHaveCount(0);
});

test('ticking Swim, Fly, or Climb applies Greater Disadvantage', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();
   await situationRow(dialog, labels.swim).locator('[data-testid^="situation-toggle-"]').click();
   await expect(dialog.getByTestId('check-summary-difficulty')).toHaveText('6');

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters).toMatchObject({
      advantage: -2,
      baseDifficulty: 4,
      difficulty: 6,
   });
   expect(flags.parameters.situations.map((situation) => situation.label)).toEqual([labels.swim]);
});

test('a ticked Jump does not apply once the check\'s Skill changes', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();
   await situationRow(dialog, labels.jump).locator('[data-testid^="situation-toggle-"]').click();
   await setSelectField(dialog, 'skill', 'dexterity');
   await expect(situationRow(dialog, labels.jump)).toHaveCount(0);

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.automaticFailure).toBe(false);
   expect(flags.parameters.situations).toEqual([]);
});

test('Heavy and Encumbering merge into one Athletics entry, and Loud offers its own on Stealth', async () => {
   await seedArmoredActor([
      'heavy',
      'encumbering',
      'loud',
   ]);
   /** @type {{athletics: object[], stealth: object[]}} The Advantage-type situational modifiers per Skill. */
   const modifiers = await page.evaluate((actorName) => {
      /** @type {CharacterDataModel} The seeded actor's data model. */
      const system = game.actors.getName(actorName).system;

      /**
       * Lists an Attribute Check's Advantage-type situational modifiers for one Skill.
       * @param {string} skill - The check's Skill.
       * @returns {object[]} The Advantage-type entries.
       */
      const advantageOnly = (skill) => system.getSituationalCheckModifiers('attribute', { skill })
         .filter((modifier) => modifier.modifierType === 'advantage');
      return {
         athletics: advantageOnly('athletics'),
         stealth: advantageOnly('stealth'),
      };
   }, ACTOR_NAME);
   expect(modifiers.athletics).toEqual([
      expect.objectContaining({
         label: labels.swim,
         sources: [ARMOR_NAME],
         value: -3,
      }),
   ]);
   expect(modifiers.stealth).toEqual([
      expect.objectContaining({
         label: labels.undetected,
         sources: [ARMOR_NAME],
         value: -1,
      }),
   ]);
});

test('unequipping the armor removes its situational modifiers', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();

   /** @type {import('@playwright/test').Locator} The Jump situation row. */
   const jump = situationRow(dialog, labels.jump);
   await expect(jump).toBeVisible();

   await page.evaluate(async (actorName) => {
      await game.actors.getName(actorName).system.unEquipArmor();
   }, ACTOR_NAME);
   await expect(jump).toHaveCount(0);
   await expect(situationRow(dialog, labels.swim)).toHaveCount(0);
});
