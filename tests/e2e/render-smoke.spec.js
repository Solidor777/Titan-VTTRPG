import { test } from '@playwright/test';
import { ensureDocument, login, renderSheet } from './fixtures.js';

// The seven TITAN Item subtypes, all rendered through the shared item sheet.
const ITEM_TYPES = [
   'ability',
   'armor',
   'commodity',
   'equipment',
   'shield',
   'spell',
   'weapon',
];

test.describe('v14 render-smoke', () => {
   // Log in before every surface so a single failure never poisons the rest.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // Player actor sheet.
   test('player actor sheet renders', async ({ page }) => {
      // Ensure a player actor exists, then render and assert its sheet.
      const locate = await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      await renderSheet(page, locate, '.titan-player-sheet');
   });

   // NPC actor sheet.
   test('npc actor sheet renders', async ({ page }) => {
      // Ensure an npc actor exists, then render and assert its sheet.
      const locate = await ensureDocument(page, 'Actor', 'npc', 'E2E NPC');
      await renderSheet(page, locate, '.titan-npc-sheet');
   });

   // One render check per Item subtype.
   for (const type of ITEM_TYPES) {
      test(`${type} item sheet renders`, async ({ page }) => {
         // Ensure an item of the subtype exists, then render and assert its sheet.
         const locate = await ensureDocument(page, 'Item', type, `E2E ${type}`);
         await renderSheet(page, locate, '.titan-item-sheet');
      });
   }

   // Effect ActiveEffect sheet (embedded on an actor).
   test('effect active-effect sheet renders', async ({ page }) => {
      // Ensure a host player actor, ensure it carries an effect, then locate it.
      await ensureDocument(page, 'Actor', 'player', 'E2E Player');
      const locate = await page.evaluate(async () => {
         // The host actor that will carry the test ActiveEffect.
         const actor = globalThis.game.actors.find((a) => a.type === 'player' && a.name === 'E2E Player')
            ?? globalThis.game.actors.find((a) => a.type === 'player');

         // Create the effect only if the host does not already have one.
         let effect = actor.effects.find((e) => e.name === 'E2E Effect');
         if (!effect) {
            const [created] = await actor.createEmbeddedDocuments('ActiveEffect', [
               { name: 'E2E Effect', type: 'effect' },
            ]);
            effect = created;
         }
         return { actorId: actor.id, effectId: effect.id };
      });

      // Build a locator that resolves the embedded effect from the world.
      const locateSrc = `() => game.actors.get('${locate.actorId}')?.effects.get('${locate.effectId}')`;
      await renderSheet(page, locateSrc, '.titan-effect-sheet');
   });
});
