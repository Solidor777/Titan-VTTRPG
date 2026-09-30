import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { clickRoll, readNewestCheckFlags, setNumberField } from './checkDialog.js';
import {
   attachPageErrors,
   buildCheck,
   clearChat,
   closeAllApps,
   controlFixtureActorToken,
   deleteFixtureActor,
   deleteOrphanedTokens,
   showChatLog,
} from './world.js';

/**
 * An item chat card's check button rolls from a frozen plain snapshot of the card's item data. With the check
 * options dialog shown, the snapshot passes through the dialog's frozen Check Options into the rolled check, so this
 * spec rolls from a card whose item no longer exists and asserts the created `itemCheck` message carries the card's
 * data and the dialog's edit.
 */

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

/** @type {string} Name of the fixture actor whose controlled token rolls the card's check. */
const ACTOR_NAME = 'E2E Item Card Dialog Actor';

/** @type {string} Name of the world item whose card is posted, then deleted. */
const ITEM_NAME = 'E2E Item Card Dialog Item';

/** @type {string} Description of the item, carried by the card snapshot. */
const ITEM_DESCRIPTION = 'Item card dialog description body.';

/** @type {string} Name of the item's Custom Trait. */
const TRAIT_NAME = 'E2E Item Card Dialog Trait';

/** @type {string} Label of the item's one check. */
const CHECK_LABEL = 'E2E Item Card Dialog Check';

/** @type {string} Selector for the Item Check dialog window. */
const DIALOG_SELECTOR = '.application.titan-dialog[id^="titan-item-check-dialog-"]';

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);

   // The chat log must be on screen: cards in a collapsed sidebar sit outside the viewport.
   await showChatLog(page);
   await deleteOrphanedTokens(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate(async (itemName) => {
      await game.settings.set('titan', 'getCheckOptions', 'situational');
      await game.items.getName(itemName)?.delete();
   }, ITEM_NAME);
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('an item card\'s check rolls through the shown dialog from the card snapshot', async () => {
   // The actor's controlled token rolls the card's check; the dialog opens for every check.
   await deleteFixtureActor(page, ACTOR_NAME);
   await page.evaluate(async (actorName) => {
      await game.settings.set('titan', 'getCheckOptions', 'always');
      await Actor.create({
         name: actorName,
         type: 'player',
      });
   }, ACTOR_NAME);
   await controlFixtureActorToken(page, {
      actorName: ACTOR_NAME,
      fallbackSceneName: 'E2E Item Card Dialog Scene',
   });

   // Post the card of a world item with a trait and one damaging 5:2 check, then delete the item: the card's
   // snapshot is the only remaining source of its data.
   /** @type {string} The posted card's message id. */
   const messageId = await page.evaluate(async ({ itemName, description, traitName, check }) => {
      await game.items.getName(itemName)?.delete();

      /** @type {TitanItem} The world item. */
      const item = await Item.create({
         name: itemName,
         type: 'equipment',
         system: {
            check: [check],
            customTrait: [
               {
                  description: 'Trait for the item card dialog e2e.',
                  name: traitName,
                  uuid: 'e2ec0de1-e2ec-4de1-8de1-e2ec0de1e2ec',
               },
            ],
            description,
         },
      });

      /** @type {ChatMessage} The posted card. */
      const message = await item.sendToChat();
      await item.delete();
      return message.id;
   }, {
      itemName: ITEM_NAME,
      description: ITEM_DESCRIPTION,
      traitName: TRAIT_NAME,
      check: buildCheck(CHECK_LABEL, 'e2ec0de2-e2ec-4de2-8de2-e2ec0de2e2ec', {
         complexity: 2,
         damageReducedBy: 'none',
         difficulty: 5,
         initialValue: 3,
         isDamage: true,
         opposedCheck: {
            attribute: 'body',
            enabled: false,
            skill: 'athletics',
         },
         resistanceCheck: 'none',
         resolveCost: 0,
         skill: 'athletics',
      }),
   });
   await expect.poll(
      () => page.evaluate((name) => game.items.getName(name) === undefined, ITEM_NAME),
      { message: 'the carded item is deleted' },
   ).toBe(true);

   // The card's check button opens the Item Check dialog.
   /** @type {import('@playwright/test').Locator} The posted card. */
   const card = page.locator(`#chat .message[data-message-id="${messageId}"] .item-chat-message`).first();
   await expect(card).toBeVisible();
   await card.getByRole('button').filter({ hasText: CHECK_LABEL }).first().click();

   /** @type {import('@playwright/test').Locator} The Item Check dialog. */
   const dialog = page.locator(DIALOG_SELECTOR).first();
   await expect(dialog).toBeVisible();
   await setNumberField(dialog, 'diceMod', 1);

   // Roll: the dialog closes and one itemCheck message carries the snapshot and the dialog's edit.
   /** @type {number} The chat-message count before the roll. */
   const baseline = await clickRoll(dialog, page);
   /** @type {{id: string, type: string, parameters: object, results: object}} The rolled check's message. */
   const flags = await readNewestCheckFlags(page, baseline, 'itemCheck');
   await expect(page.locator(DIALOG_SELECTOR)).toHaveCount(0);
   expect(flags.parameters).toMatchObject({
      checkLabel: CHECK_LABEL,
      complexity: 2,
      damage: 3,
      diceMod: 1,
      difficulty: 5,
      itemDescription: ITEM_DESCRIPTION,
      itemName: ITEM_NAME,
      skill: 'athletics',
   });
   expect(flags.parameters.customTrait).toEqual([
      expect.objectContaining({
         name: TRAIT_NAME,
      }),
   ]);

   // The rolled card renders from the created message.
   await expect(page.locator(`#chat .message[data-message-id="${flags.id}"]`).first()).toBeVisible();
});
