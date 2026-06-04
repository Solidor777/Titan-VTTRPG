import { expect, test } from '@playwright/test';
import { collectLocalizationOffenders, ensureDocument, login, renderSheet } from './fixtures.js';

// The seven TITAN Item subtypes, all rendered through the shared item sheet.
const ITEM_TYPES = ['ability', 'armor', 'commodity', 'equipment', 'shield', 'spell', 'weapon'];

test.describe('no double-localized (LOCAL.) text in rendered UI', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   test('player actor sheet', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      await renderSheet(page, locate, '.titan-player-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-player-sheet');
      expect(offenders, `LOCAL. text on player sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('npc actor sheet', async ({ page }) => {
      const locate = await ensureDocument(page, 'Actor', 'npc', 'E2E NPC');
      await renderSheet(page, locate, '.titan-npc-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-npc-sheet');
      expect(offenders, `LOCAL. text on npc sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   for (const type of ITEM_TYPES) {
      test(`${type} item sheet`, async ({ page }) => {
         const locate = await ensureDocument(page, 'Item', type, `E2E ${type}`);
         await renderSheet(page, locate, '.titan-item-sheet');
         const offenders = await collectLocalizationOffenders(page, '.titan-item-sheet');
         expect(offenders, `LOCAL. text on ${type} sheet:\n${offenders.join('\n')}`).toEqual([]);
      });
   }

   test('embedded effect sheet', async ({ page }) => {
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
      await renderSheet(page, locateSrc, '.titan-effect-sheet');
      const offenders = await collectLocalizationOffenders(page, '.titan-effect-sheet');
      expect(offenders, `LOCAL. text on effect sheet:\n${offenders.join('\n')}`).toEqual([]);
   });

   test('effects sidebar header, rows, and context menu', async ({ page }) => {
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
