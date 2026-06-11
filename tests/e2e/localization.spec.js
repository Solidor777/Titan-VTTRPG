import { expect, test } from '@playwright/test';
import { collectLocalizationOffenders, ensureDocument, login, renderSheet } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

// The seven TITAN Item subtypes, all rendered through the shared item sheet.
const ITEM_TYPES = ['ability', 'armor', 'commodity', 'equipment', 'shield', 'spell', 'weapon'];

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

test.describe('no double-localized (LOCAL.) text in rendered UI', () => {
   test('player actor sheet', async () => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      await renderSheet(page, locate, '.titan-player-sheet', errors);
      const offenders = await collectLocalizationOffenders(page, '.titan-player-sheet');
      expect(offenders, `LOCAL. text on player sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('npc actor sheet', async () => {
      const locate = await ensureDocument(page, 'Actor', 'npc', 'E2E NPC');
      await renderSheet(page, locate, '.titan-npc-sheet', errors);
      const offenders = await collectLocalizationOffenders(page, '.titan-npc-sheet');
      expect(offenders, `LOCAL. text on npc sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   for (const type of ITEM_TYPES) {
      test(`${type} item sheet`, async () => {
         const locate = await ensureDocument(page, 'Item', type, `E2E ${type}`);
         await renderSheet(page, locate, '.titan-item-sheet', errors);
         const offenders = await collectLocalizationOffenders(page, '.titan-item-sheet');
         expect(offenders, `LOCAL. text on ${type} sheet:\n${offenders.join('\n')}`).toEqual([]);
      });
   }

   test('embedded effect sheet', async () => {
      await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      const ids = await page.evaluate(async () => {
         const actor = game.actors.find((a) => a.type === 'player' && a.name === 'E2E Player')
            ?? game.actors.find((a) => a.type === 'player');
         let effect = actor.effects.find((e) => e.name === 'E2E Effect');
         if (!effect) {
            const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
               { name: 'E2E Effect', type: 'effect' },
            ]);
            effect = created;
         }
         return { actorId: actor.id, effectId: effect.id };
      });
      const locateSrc = `() => game.actors.get('${ids.actorId}')?.effects.get('${ids.effectId}')`;
      await renderSheet(page, locateSrc, '.titan-effect-sheet', errors);
      const offenders = await collectLocalizationOffenders(page, '.titan-effect-sheet');
      expect(offenders, `LOCAL. text on effect sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('spell aspect surfaces, every spell tab, and the casting-check dialog', async () => {
      // Seed a spell with enabled range + duration aspects (string and numeric values) on a player.
      await page.evaluate(async () => {
         const actor = game.actors.find((a) => a.type === 'player' && a.name === 'E2E Player')
            ?? await Actor.create({ name: 'E2E Player', type: 'player' });
         let spell = actor.items.find((i) => i.name === 'E2E Aspect Spell');
         if (!spell) {
            [spell] = await actor.createEmbeddedDocuments('Item', [
               { name: 'E2E Aspect Spell', type: 'spell' },
            ]);
         }
         await spell.update({
            system: {
               aspect: [
                  {
                     label: 'range',
                     initialValue: 10,
                     cost: 2,
                     enabled: true,
                  },
                  {
                     label: 'duration',
                     scaling: true,
                     initialValue: 1,
                     unit: 'rounds',
                     cost: 1,
                     enabled: true,
                     scalingCost: 1,
                  },
               ],
            },
         });
         await spell.sheet.render(true);
         await titanWait(() => !!spell.sheet.element, { message: 'spell sheet rendered' });
      });

      // Walk every tab in the sheet's tab strip, scanning each rendered state.
      const sheet = page.locator('.titan-item-sheet:has-text("E2E Aspect Spell")');
      const tabButtons = sheet.locator('.tab-list button');
      const tabCount = await tabButtons.count();
      for (let idx = 0; idx < tabCount; idx++) {
         await tabButtons.nth(idx).click();
         const offenders = await collectLocalizationOffenders(page, '.titan-item-sheet');
         expect(offenders, `LOCAL. text on spell sheet tab ${idx}:\n${offenders.join('\n')}`).toEqual([]);
      }

      // The casting-check options dialog (gated by the getCheckOptions setting).
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', true);
         const actor = game.actors.find((a) => a.type === 'player' && a.name === 'E2E Player');
         const spell = actor.items.find((i) => i.name === 'E2E Aspect Spell');
         actor.system.requestCastingCheck({ itemId: spell.id });
      });
      await expect(page.locator('.titan-dialog')).toBeVisible();
      const dialogOffenders = await collectLocalizationOffenders(page, '.titan-dialog');
      await page.evaluate(async () => {
         await game.settings.set('titan', 'getCheckOptions', false);
      });
      expect(dialogOffenders, `LOCAL. text in casting dialog:\n${dialogOffenders.join('\n')}`).toEqual([]);
   });

   test('effects sidebar header, rows, and context menu', async () => {
      await page.evaluate(async () => {
         let pack = game.packs.get('world.e2e-tray-effects');
         if (!pack) {
            pack = await CompendiumCollection.createCompendium({
               type: 'ActiveEffect', label: 'E2E Tray Effects', name: 'e2e-tray-effects',
            });
         }
         const existing = (await pack.getDocuments()).find((e) => e.name === 'E2E Tray Effect');
         if (!existing) {
            await ActiveEffect.create({ name: 'E2E Tray Effect', type: 'effect' }, { pack: pack.collection });
         }
         await ui.titanEffects.render(true);
         ui.titanEffects.activate();
         await titanWait(
            () => !!ui.titanEffects.element
               ?.querySelector('[data-testid="effect-tray-pack-select"] option'),
            { message: 'tray pack-select options rendered' },
         );
         const select = ui.titanEffects.element.querySelector('[data-testid="effect-tray-pack-select"]');
         select.value = 'world.e2e-tray-effects';
         select.dispatchEvent(new Event('change', { bubbles: true }));
         await titanWait(
            () => !!ui.titanEffects.element?.querySelector('[data-testid="effect-tray-row"]'),
            { message: 'tray rows rendered for selected pack' },
         );
      });

      const trayOffenders = await collectLocalizationOffenders(page, '[data-testid="effect-tray"]');
      expect(trayOffenders, `LOCAL. text in effect tray:\n${trayOffenders.join('\n')}`).toEqual([]);

      await page.locator('[data-testid="effect-tray-row"]').first().click({ button: 'right' });
      await expect(page.locator('#context-menu')).toBeVisible();
      const menuOffenders = await collectLocalizationOffenders(page, '#context-menu');
      expect(menuOffenders, `LOCAL. text in context menu:\n${menuOffenders.join('\n')}`).toEqual([]);
   });
});
