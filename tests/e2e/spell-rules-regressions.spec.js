import { expect, test } from './harness.js';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * Regressions for conditional check modifiers on casting checks and for the aspect tags of a spell on a character. Each
 * runs against the live rendered sheet or the live actor.
 */

/** @type {string} Name of the throwaway player actor seeded for this spec. */
const ACTOR_NAME = 'E2E Spell Rules Actor';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
});

test.beforeEach(async () => {
   // A fresh player with an ability granting +2 dice to casting checks of spells with the Void custom trait and
   // +1 expertise to every casting check, plus a Void spell that one aspect of which is resisted by Resilience.
   await page.evaluate(async (actorName) => {
      /** @type {TitanActor | undefined} A leftover actor from an earlier run. */
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }
      /** @type {TitanActor} The freshly seeded player. */
      const actor = await Actor.create({
         name: actorName,
         type: 'player',
      });
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Void Focus',
            type: 'ability',
            system: {
               rulesElement: [
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'dice',
                     checkType: 'casting',
                     selector: 'customTrait',
                     key: 'void',
                     value: 2,
                     uuid: 'e2e00000-0000-4000-a000-000000000001',
                  },
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'expertise',
                     checkType: 'casting',
                     selector: 'any',
                     key: 'any',
                     value: 1,
                     uuid: 'e2e00000-0000-4000-a000-000000000002',
                  },
               ],
            },
         },
         {
            name: 'E2E Void Spell',
            type: 'spell',
            system: {
               customTrait: [
                  {
                     name: 'Void',
                     description: '',
                     uuid: 'e2e00000-0000-4000-a000-000000000003',
                  },
               ],
               aspect: [
                  {
                     label: 'inflictCondition',
                     cost: 4,
                     option: [
                        'stunned',
                     ],
                     resistanceCheck: 'resilience',
                     enabled: true,
                  },
               ],
            },
         },
      ]);
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await deleteFixtureActor(page, ACTOR_NAME);
   await page?.close();
});

test('casting check options apply custom-trait dice and casting expertise modifiers', async () => {
   /** @type {{diceMod: number, expertiseMod: number}} The casting check's dice and expertise modifiers. */
   const mods = await page.evaluate((actorName) => {
      /** @type {TitanActor} The seeded player. */
      const actor = game.actors.getName(actorName);

      /** @type {TitanItem} The Void spell. */
      const spell = actor.items.getName('E2E Void Spell');

      /** @type {object} The initialized casting check options. */
      const options = actor.system.initializeCastingCheckOptions({ itemId: spell.id });
      return {
         diceMod: options.diceMod,
         expertiseMod: options.expertiseMod,
      };
   }, ACTOR_NAME);
   expect(mods).toEqual({
      diceMod: 2,
      expertiseMod: 1,
   });
});

test('conditional dice and expertise apply to item checks and to tradition-keyed casting checks', async () => {
   /** @type {{castingDice: number, castingExpertise: number, itemDice: number}} The applied modifiers. */
   const mods = await page.evaluate(async (actorName) => {
      /** @type {TitanActor} The seeded player. */
      const actor = game.actors.getName(actorName);
      await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Fire Focus',
            type: 'ability',
            system: {
               // Keys as a player types them: a capitalised tradition and a spaced custom trait.
               rulesElement: [
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'dice',
                     checkType: 'casting',
                     selector: 'spellTradition',
                     key: 'Fire',
                     value: 3,
                     uuid: 'e2e00000-0000-4000-a000-000000000011',
                  },
                  {
                     operation: 'conditionalCheckModifier',
                     modifierType: 'dice',
                     checkType: 'item',
                     selector: 'customTrait',
                     key: 'Field Medicine',
                     value: 2,
                     uuid: 'e2e00000-0000-4000-a000-000000000012',
                  },
               ],
            },
         },
         {
            name: 'E2E Fire Spell',
            type: 'spell',
            system: { tradition: 'Fire' },
         },
         {
            name: 'E2E Field Kit',
            type: 'ability',
            system: {
               customTrait: [
                  {
                     name: 'Field Medicine',
                     description: '',
                     uuid: 'e2e00000-0000-4000-a000-000000000013',
                  },
               ],
               check: [
                  {
                     attribute: 'mind',
                     complexity: 1,
                     damageReducedBy: 'none',
                     difficulty: 4,
                     initialValue: 1,
                     isDamage: false,
                     isHealing: false,
                     label: 'Treat',
                     opposedCheck: {
                        attribute: 'body',
                        enabled: false,
                        skill: 'athletics',
                     },
                     resistanceCheck: 'none',
                     resolveCost: 0,
                     scaling: false,
                     skill: 'medicine',
                     uuid: 'e2e00000-0000-4000-a000-000000000014',
                  },
               ],
            },
         },
      ]);
      /** @type {object} The Fire spell's casting check options. */
      const casting = actor.system.initializeCastingCheckOptions({ itemId: actor.items.getName('E2E Fire Spell').id });

      /** @type {object} The Field Kit's item check options. */
      const item = actor.system.initializeItemCheckOptions({
         itemId: actor.items.getName('E2E Field Kit').id,
         checkIdx: 0,
      });
      return {
         // The Void Focus's +1 casting expertise from beforeEach also applies to the Fire spell.
         castingDice: casting.diceMod,
         castingExpertise: casting.expertiseMod,
         itemDice: item.diceMod,
      };
   }, ACTOR_NAME);
   expect(mods).toEqual({
      castingDice: 3,
      castingExpertise: 1,
      itemDice: 2,
   });
});

test('the character sheet spell row and the spell chat card list the displayed aspect tags by size', async () => {
   // Display order is damage, range, inflictCondition, then the custom aspect; decreaseMod lacks its required option
   // and is disabled, so the exact label lists below exclude it. Tag sizes: range 0, damage 1 (scaling; a 'none'
   // resistance adds nothing), E2E Ward 2 (a resistance check), inflictCondition 3 (one option and a resistance check).
   /** @type {{spellId: string, labels: string[]}} The seeded spell and its expected tag labels, smallest first. */
   const seeded = await page.evaluate(async (actorName) => {
      /** @type {TitanActor} The seeded player. */
      const actor = game.actors.getName(actorName);

      /** @type {TitanItem[]} The created spell, alone in the array. */
      const [spell] = await actor.createEmbeddedDocuments('Item', [
         {
            name: 'E2E Tag Order Spell',
            type: 'spell',
            system: {
               aspect: [
                  {
                     label: 'damage',
                     scaling: true,
                     initialValue: 1,
                     cost: 1,
                     resistanceCheck: 'none',
                     isDamage: true,
                     option: [],
                     enabled: true,
                  },
                  {
                     label: 'range',
                     initialValue: 'self',
                     cost: 0,
                     enabled: true,
                  },
                  {
                     label: 'decreaseMod',
                     initialValue: 1,
                     cost: 0,
                     option: [],
                     resistanceCheck: 'none',
                     scaling: true,
                     enabled: false,
                  },
                  {
                     label: 'inflictCondition',
                     cost: 4,
                     option: [
                        'stunned',
                     ],
                     resistanceCheck: 'resilience',
                     enabled: true,
                  },
               ],
               customAspect: [
                  {
                     label: 'E2E Ward',
                     scaling: false,
                     initialValue: 1,
                     cost: 1,
                     resistanceCheck: 'reflexes',
                     isDamage: false,
                     isHealing: false,
                     uuid: 'e2e00000-0000-4000-a000-000000000301',
                  },
               ],
            },
         },
      ]);

      /** @type {TitanDocumentSheet} The rendered character sheet. */
      const app = await actor.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return {
         spellId: spell.id,
         labels: [
            game.i18n.localize('LOCAL.range.text'),
            game.i18n.localize('LOCAL.damage.text'),
            'E2E Ward',
            game.i18n.localize('LOCAL.inflictCondition.text'),
         ],
      };
   }, ACTOR_NAME);

   // Character sheet: expand the spell row in place and read its aspect tags.
   await openSheetTab(page, 'Spells');

   /** @type {import('@playwright/test').Locator} The seeded spell's row. */
   const row = page.locator(`.application.titan-document-sheet [data-item-id="${seeded.spellId}"]`);
   await row.locator('.header .label .button button').first().click();

   /** @type {import('@playwright/test').Locator} The row's aspect tag labels. */
   const rowLabels = row.locator('.tag-container > .tag .label');
   await expect(rowLabels).toHaveText(seeded.labels);

   // Chat card: the same selection in the same order.
   /** @type {string} The posted spell card's message id. */
   const messageId = await page.evaluate(async ({ actorName, spellId }) => {
      /** @type {ChatMessage} The posted spell card. */
      const message = await game.actors.getName(actorName).items.get(spellId).sendToChat();
      return message.id;
   }, {
      actorName: ACTOR_NAME,
      spellId: seeded.spellId,
   });

   // The card is deleted even when an assertion fails, so a failed run leaves no message behind.
   try {
      /** @type {import('@playwright/test').Locator} The mounted spell card. */
      const card = page.locator(`#chat .message[data-message-id="${messageId}"] .item-chat-message`).first();
      await expect(card.locator('.tag-container > .tag .label')).toHaveText(seeded.labels);

      // Core's ChatLog posts the card's notification asynchronously and re-queries it by message id when done; a
      // deletion before the notification is shown makes that query return null and raises an error in core.
      await expect(page.locator(`#chat-notifications .message[data-message-id="${messageId}"]:not([hidden])`))
         .toBeVisible();
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   }
   finally {
      await page.evaluate((id) => game.messages.get(id)?.delete(), messageId);
   }
});
