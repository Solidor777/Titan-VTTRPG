import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { attachPageErrors, clearChat, closeAllApps, deleteFixtureActor } from './world.js';
import { clickRoll, readNewestCheckFlags } from './checkDialog.js';
import { settle } from './settle.js';

/**
 * A chat card re-localizes a system situation from its stored label key. The dialog behaviour of equipped Heavy,
 * Encumbering, and Loud armor is tested in `check-dialog.spec.js`.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Armor Trait Actor';

/** @type {string} Name of the armor item seeded for this spec. */
const ARMOR_NAME = 'E2E Trait Armor';

/** @type {string} Selector for the Attribute Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-attribute-check-dialog-"]';

/** @type {{swim: string}} The stable, locale-independent situation keys. */
const KEYS = {
   swim: 'swim,Fly,OrClimb',
};

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;
/** @type {{swim: string}} The localized situation labels. */
let labels;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
   labels = await page.evaluate(() => ({
      swim: game.i18n.localize('LOCAL.situationSwimFlyClimb.text'),
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
 * Locates a situation row in a dialog by its stable key.
 * @param {import('@playwright/test').Locator} dialog - The dialog window.
 * @param {string} key - The situation's stable key.
 * @returns {import('@playwright/test').Locator} The dialog's situation entry carrying that key.
 */
function situationRow(dialog, key) {
   return dialog.getByTestId(`situation-row-${key}`);
}

test('a chat card re-localizes a system situation from its stored labelKey', async () => {
   await seedArmoredActor(['heavy']);

   /** @type {import('@playwright/test').Locator} The open Athletics dialog. */
   const dialog = await openAthleticsDialog();
   await situationRow(dialog, KEYS.swim).locator('[data-testid^="situation-toggle-"]').click();

   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);

   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline);
   expect(flags.parameters.situations).toEqual([
      {
         key: KEYS.swim,
         label: labels.swim,
         labelKey: 'situationSwimFlyClimb',
      },
   ]);

   /** @type {import('@playwright/test').Locator} The rolled check's situation tag. */
   const tag = page.locator(`#chat .message[data-message-id="${flags.id}"]`).getByTestId('check-chat-situation');
   await expect(tag).toHaveText([labels.swim]);

   // Without a labelKey the stored label renders, so the tag text follows the stored label.
   await setStoredSituation(flags.id, {
      key: KEYS.swim,
      label: 'Stored In Another Language',
   });
   await expect(tag).toHaveText(['Stored In Another Language']);

   // With a labelKey the current language's text renders and the stored label is ignored.
   await setStoredSituation(flags.id, {
      key: KEYS.swim,
      label: 'Stored In Another Language',
      labelKey: 'situationSwimFlyClimb',
   });
   await expect(tag).toHaveText([labels.swim]);
});

/**
 * Overwrites a rolled check message's stored situations with one entry.
 * @param {string} messageId - The chat message id.
 * @param {object} situation - The stored situation entry.
 * @returns {Promise<void>} Resolves once the message is updated.
 */
async function setStoredSituation(messageId, situation) {
   await page.evaluate(async ({ id, entry }) => {
      /** @type {ChatMessage} The rolled check's message. */
      const chatMessage = game.messages.get(id);

      /** @type {object} A detached copy of its system data. */
      const system = chatMessage.system.toObject();
      system.parameters.situations = [entry];
      await chatMessage.update({ system });
   }, {
      id: messageId,
      entry: situation,
   });
   await settle(page);
}
