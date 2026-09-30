import { expect, test } from '@playwright/test';
import { login, openSheetTab } from './fixtures.js';
import { attachPageErrors, closeAllApps, deleteFixtureActor } from './world.js';

/**
 * Regressions for conditional check modifiers on casting checks, item deletion from a character, and the
 * spell sheet's "resisted by" tag. Each runs against the live rendered sheet or the live actor.
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
         {
            name: 'E2E Worn Armor',
            type: 'armor',
         },
      ]);
   }, ACTOR_NAME);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page.evaluate((name) => game.items.getName(name)?.delete(), PANEL_SPELL_NAME);
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

test('the spells tab renders a custom-trait spell row without errors', async () => {
   await page.evaluate(async (actorName) => {
      /** @type {TitanDocumentSheet} The rendered character sheet. */
      const app = await game.actors.getName(actorName).sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
   }, ACTOR_NAME);
   await openSheetTab(page, 'Spells');
   await expect(page.locator('.application.titan-document-sheet [data-item-id]', { hasText: 'E2E Void Spell' }))
      .toBeVisible();
   expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
});

test('deleting an equipped item raises no error and un-equips it', async () => {
   /**
    * @type {{equippedBefore: boolean, equippedAfter: string | null, stillOwned: boolean, raised: string[]}}
    * The armor's equipped and owned state around the delete, and the error notifications it raised.
    */
   const result = await page.evaluate(async (actorName) => {
      /** @type {TitanActor} The seeded player. */
      const actor = game.actors.getName(actorName);

      /** @type {TitanItem} The armor to equip and delete. */
      const armor = actor.items.getName('E2E Worn Armor');
      await actor.system.equipArmor(armor.id);

      /** @type {string | null} The equipped armor's id before the delete. */
      const equippedBefore = actor.system.equipped.armor;

      // Record error notifications raised during the delete.
      /** @type {string[]} The error notification messages raised during the delete. */
      const raised = [];

      /** @type {Function} The unwrapped error notifier, restored after the delete. */
      const original = ui.notifications.error;
      ui.notifications.error = (message, ...rest) => {
         raised.push(String(message));
         return original.call(ui.notifications, message, ...rest);
      };
      try {
         await actor.deleteItem(armor.id);
      }
      finally {
         ui.notifications.error = original;
      }
      return {
         equippedBefore: equippedBefore === armor.id,
         equippedAfter: actor.system.equipped.armor,
         stillOwned: actor.items.has(armor.id),
         raised,
      };
   }, ACTOR_NAME);
   expect(result.equippedBefore, 'the armor was equipped before the delete').toBe(true);
   expect(result.stillOwned, 'the armor is deleted').toBe(false);
   expect(result.equippedAfter, 'the deleted armor is no longer equipped').toBeFalsy();
   expect(result.raised, 'no error notification during the delete').toEqual([]);
});

test('the spell sheet sidebar labels the aspect resistance', async () => {
   /** @type {string} The rendered spell sheet's application id. */
   const appId = await page.evaluate(async (actorName) => {
      /** @type {TitanDocumentSheet} The rendered spell sheet. */
      const app = await game.actors.getName(actorName).items.getName('E2E Void Spell').sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'spell sheet mounted' },
      );
      return app.id;
   }, ACTOR_NAME);
   /** @type {import('@playwright/test').Locator} The sidebar's Resilience resistance tag. */
   const tag = page.locator(`[id="${appId}"] .labeled-stat .value .tag.resilience`);
   await expect(tag).toBeVisible();
   await expect(tag).toHaveText('Resilience');
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

/** @type {string} Name of the world spell the Casting Check tab specs render. */
const PANEL_SPELL_NAME = 'E2E Aspect Panel Spell';

/**
 * Creates the world spell with the given custom aspects alongside a range, a damage, and a disabled (option-less)
 * decrease-mod standard aspect, then renders its sheet on the Casting Check tab.
 * @param {number} customCount - How many custom aspects to give the spell.
 * @returns {Promise<string>} The rendered sheet's application id.
 */
async function openPanelSpell(customCount) {
   /** @type {string} The rendered spell sheet's application id. */
   const appId = await page.evaluate(async ({ name, count }) => {
      await game.items.getName(name)?.delete();

      /** @type {TitanItem} The created world spell. */
      const item = await Item.create({
         name,
         type: 'spell',
         system: {
            aspect: [
               {
                  label: 'range',
                  initialValue: 'self',
                  cost: 0,
                  enabled: true,
               },
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
                  label: 'decreaseMod',
                  initialValue: 1,
                  cost: 0,
                  option: [],
                  resistanceCheck: 'none',
                  scaling: true,
                  enabled: false,
               },
            ],
            customAspect: Array.from({ length: count }, (unused, index) => ({
               label: `E2E Custom ${index}`,
               scaling: true,
               initialValue: 1,
               cost: index + 1,
               resistanceCheck: 'none',
               isDamage: false,
               isHealing: false,
               uuid: `e2e00000-0000-4000-a000-0000000001${String(index).padStart(2, '0')}`,
            })),
         },
      });
      /** @type {TitanDocumentSheet} The rendered spell sheet. */
      const app = await item.sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'spell sheet mounted' },
      );
      return app.id;
   }, {
      name: PANEL_SPELL_NAME,
      count: customCount,
   });
   await openSheetTab(page, await page.evaluate(() => game.i18n.localize('LOCAL.castingCheck.text')));
   return appId;
}

test('the spell sheet Casting Check tab lists the aspects that make up the total cost', async () => {
   /** @type {string} The rendered spell sheet's application id. */
   const appId = await openPanelSpell(1);

   // The panel lists each enabled standard aspect by its localized label and computed cost, then the custom aspect.
   /** @type {import('@playwright/test').Locator} The Aspect Costs panel. */
   const costs = page.locator(`[id="${appId}"] .aspect-costs`);

   /**
    * @type {{range: string, damage: string, custom: string, rangeLabel: string, damageLabel: string,
    * disabledLabel: string}} The document's computed costs and the localized aspect labels.
    */
   const expected = await page.evaluate((name) => {
      /** @type {object} The spell's prepared system data. */
      const system = game.items.getName(name).system;
      return {
         range: String(system.aspect.find((aspect) => aspect.label === 'range').cost),
         damage: String(system.aspect.find((aspect) => aspect.label === 'damage').cost),
         custom: String(system.customAspect[0].cost),
         rangeLabel: game.i18n.localize('LOCAL.range.text'),
         damageLabel: game.i18n.localize('LOCAL.damage.text'),
         disabledLabel: game.i18n.localize('LOCAL.decreaseMod.text'),
      };
   }, PANEL_SPELL_NAME);
   await expect(costs.locator('.tag')).toHaveCount(3);
   await expect(costs.locator('.tag .label')).toHaveText([
      expected.rangeLabel,
      expected.damageLabel,
      'E2E Custom 0',
   ]);
   await expect(costs.locator('.tag .value')).toHaveText([
      expected.range,
      expected.damage,
      expected.custom,
   ]);

   // With the listed siblings resolved, the disabled aspect is absent.
   await expect(costs.getByText(expected.disabledLabel, { exact: true })).toHaveCount(0);
});

test('the spell sheet Casting Check tab re-prices an aspect while it is open', async () => {
   /** @type {string} The rendered spell sheet's application id. */
   const appId = await openPanelSpell(1);

   /** @type {import('@playwright/test').Locator} The Aspect Costs panel. */
   const costs = page.locator(`[id="${appId}"] .aspect-costs`);

   /** @type {string} The localized Range aspect label. */
   const rangeLabel = await page.evaluate(() => game.i18n.localize('LOCAL.range.text'));

   /** @type {import('@playwright/test').Locator} The Range aspect's cost value in the panel. */
   const rangeValue = costs.locator('.tag', { hasText: rangeLabel }).locator('.value');

   // A self-range aspect costs nothing.
   await expect(rangeValue).toHaveText('0');

   // Widening the range to 50 re-prices it through the shared cost calculation; the open panel follows the document.
   /** @type {string} The Range aspect's cost after the update, as the document computes it. */
   const repriced = await page.evaluate(async (name) => {
      /** @type {TitanItem} The panel's world spell. */
      const item = game.items.getName(name);

      /** @type {object[]} A copy of the stored standard aspects to edit. */
      const aspects = foundry.utils.deepClone(item._source.system.aspect);
      aspects.find((aspect) => aspect.label === 'range').initialValue = 50;
      await item.update({ 'system.aspect': aspects });
      return String(item.system.aspect.find((aspect) => aspect.label === 'range').cost);
   }, PANEL_SPELL_NAME);
   expect(repriced, 'the document re-prices the aspect').not.toBe('0');
   await expect.poll(() => rangeValue.textContent()).toBe(repriced);
});

test('the spell sheet Casting Check tab keeps its aspect list scroll position across tab switches', async () => {
   /** @type {string} The rendered spell sheet's application id. */
   const appId = await openPanelSpell(40);

   /** @type {import('@playwright/test').Locator} The panel's scrolling aspect list. */
   const content = page.locator(`[id="${appId}"] .aspect-costs .content`);
   await expect(content.locator('.tag')).toHaveCount(42);

   // Scroll the overflowing list and wait for the scroll event to be recorded.
   /** @type {number} How far the list can scroll. */
   const maxScroll = await content.evaluate((element) => element.scrollHeight - element.clientHeight);
   expect(maxScroll, 'the list overflows its container').toBeGreaterThan(40);
   await content.evaluate((element) => {
      element.scrollTop = 40;
   });
   await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(40);

   // Tabs are lazy-mounted, so leaving and returning re-mounts the container from the bound state.
   await openSheetTab(page, await page.evaluate(() => game.i18n.localize('LOCAL.standardAspects.text')));
   await expect(content).toHaveCount(0);
   await openSheetTab(page, await page.evaluate(() => game.i18n.localize('LOCAL.castingCheck.text')));
   await expect(content).toBeVisible();
   await expect.poll(() => content.evaluate((element) => element.scrollTop)).toBe(40);
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
      expect(errors, `uncaught errors:\n${errors.join('\n')}`).toEqual([]);
   }
   finally {
      await page.evaluate((id) => game.messages.get(id)?.delete(), messageId);
   }
});
