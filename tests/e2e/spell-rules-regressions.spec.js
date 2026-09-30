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
      const stale = game.actors.getName(actorName);
      if (stale) {
         await stale.delete();
      }
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
   const mods = await page.evaluate((actorName) => {
      const actor = game.actors.getName(actorName);
      const spell = actor.items.getName('E2E Void Spell');
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
   const result = await page.evaluate(async (actorName) => {
      const actor = game.actors.getName(actorName);
      const armor = actor.items.getName('E2E Worn Armor');
      await actor.system.equipArmor(armor.id);
      const equippedBefore = actor.system.equipped.armor;

      // Record error notifications raised during the delete.
      const raised = [];
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
   const appId = await page.evaluate(async (actorName) => {
      const app = await game.actors.getName(actorName).items.getName('E2E Void Spell').sheet.render(true);
      await titanWait(
         () => !!app?.element?.querySelector('.window-content')?.children.length,
         { message: 'spell sheet mounted' },
      );
      return app.id;
   }, ACTOR_NAME);
   const tag = page.locator(`[id="${appId}"] .labeled-stat .value .tag.resilience`);
   await expect(tag).toBeVisible();
   await expect(tag).toHaveText('Resilience');
});

test('conditional dice and expertise apply to item checks and to tradition-keyed casting checks', async () => {
   const mods = await page.evaluate(async (actorName) => {
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
      const casting = actor.system.initializeCastingCheckOptions({ itemId: actor.items.getName('E2E Fire Spell').id });
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
   const appId = await page.evaluate(async ({ name, count }) => {
      await game.items.getName(name)?.delete();
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
   const appId = await openPanelSpell(1);

   // The panel lists each enabled standard aspect by its localized label and computed cost, then the custom aspect.
   const costs = page.locator(`[id="${appId}"] .aspect-costs`);
   const expected = await page.evaluate((name) => {
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
   const appId = await openPanelSpell(1);
   const costs = page.locator(`[id="${appId}"] .aspect-costs`);
   const rangeLabel = await page.evaluate(() => game.i18n.localize('LOCAL.range.text'));
   const rangeValue = costs.locator('.tag', { hasText: rangeLabel }).locator('.value');

   // A self-range aspect costs nothing.
   await expect(rangeValue).toHaveText('0');

   // Widening the range to 50 re-prices it through the shared cost calculation; the open panel follows the document.
   const repriced = await page.evaluate(async (name) => {
      const item = game.items.getName(name);
      const aspects = foundry.utils.deepClone(item._source.system.aspect);
      aspects.find((aspect) => aspect.label === 'range').initialValue = 50;
      await item.update({ 'system.aspect': aspects });
      return String(item.system.aspect.find((aspect) => aspect.label === 'range').cost);
   }, PANEL_SPELL_NAME);
   expect(repriced, 'the document re-prices the aspect').not.toBe('0');
   await expect.poll(() => rangeValue.textContent()).toBe(repriced);
});

test('the spell sheet Casting Check tab keeps its aspect list scroll position across tab switches', async () => {
   const appId = await openPanelSpell(40);
   const content = page.locator(`[id="${appId}"] .aspect-costs .content`);
   await expect(content.locator('.tag')).toHaveCount(42);

   // Scroll the overflowing list and wait for the scroll event to be recorded.
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
