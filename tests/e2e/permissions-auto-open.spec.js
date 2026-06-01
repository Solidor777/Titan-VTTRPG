import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { setClientSetting } from './settings.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildTurnEffectActorData } from '../shared/builders.js';

test.describe('permissions — auto-open character sheets', () => {
   test('GM "all": the current actor sheet auto-opens on the GM client at turn start', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1' }, async ({ gm }) => {
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'all');

         // Effect actor at lower initiative → its turn starts after one nextTurn.
         const seed = {
            sceneName: 'B4 All Scene',
            effectActor: buildTurnEffectActorData('B4 All Actor'),
            otherActor: buildTurnEffectActorData('B4 All Other'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Ensure no sheet is open beforehand.
            await gm.evaluate((id) => game.actors.get(id).sheet.close(), ids.effectActorId);

            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The effect actor's sheet auto-renders on the GM client.
            await gm.waitForFunction(
               (id) => game.actors.get(id)?.sheet?.rendered === true,
               ids.effectActorId,
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.sheet?.close(), ids.effectActorId);
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });

   test('GM "disabled": no sheet auto-opens on the GM client at turn start', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1' }, async ({ gm }) => {
         await setClientSetting(gm, 'autoOpenCharacterSheetsGM', 'disabled');

         const seed = {
            sceneName: 'B4 Off Scene',
            effectActor: buildTurnEffectActorData('B4 Off Actor'),
            otherActor: buildTurnEffectActorData('B4 Off Other'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            await gm.evaluate((id) => game.actors.get(id).sheet.close(), ids.effectActorId);
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Give the turn-start handler time to run, then assert the sheet stayed closed.
            await gm.evaluate(() => new Promise((r) => setTimeout(r, 1000)));
            const rendered = await gm.evaluate(
               (id) => game.actors.get(id)?.sheet?.rendered === true,
               ids.effectActorId,
            );
            expect(rendered).toBe(false);
         }
         finally {
            await gm.evaluate((id) => game.actors.get(id)?.sheet?.close(), ids.effectActorId);
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
