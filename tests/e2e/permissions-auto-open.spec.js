import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { setClientSetting } from './settings.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildFastHealingAbilityData, buildTurnEffectActorData } from '../shared/builders.js';

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
               { timeout: 1000 },
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

         // The effect actor carries turn-start fast healing purely as a synchronization signal.
         // `onTurnStart` resolves the auto-open branch FIRST and performs the start-of-turn resource
         // updates after it, so an observed heal proves the auto-open decision has already been made
         // and declined to render. Stamina is pre-seeded below max so the +2 heal moves the value.
         const seed = {
            sceneName: 'B4 Off Scene',
            effectActor: buildTurnEffectActorData('B4 Off Actor'),
            effectAbilities: [buildFastHealingAbilityData('B4 Off Fast Healing', 2)],
            otherActor: buildTurnEffectActorData('B4 Off Other'),
            effectInitiative: 10,
            otherInitiative: 20,
            staminaValue: 1,
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            await gm.evaluate((id) => game.actors.get(id).sheet.close(), ids.effectActorId);
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The auto-open render happens several awaits deep inside the UN-AWAITED async
            // `combatNextTurn` → `onTurnStart` hook, so `nextTurn()` resolves before that branch runs.
            // Sequence on a real edge rather than a bounded settle: first the turn reaching the effect
            // actor (the pipeline was triggered), then its turn-start heal landing — which `onTurnStart`
            // performs strictly AFTER the auto-open branch, so the sheet's fate is already decided.
            await gm.waitForFunction(
               ({ combatId, combatantId }) => game.combats.get(combatId)?.combatant?.id === combatantId,
               { combatId: ids.combatId, combatantId: ids.effectCombatantId },
               { timeout: 1000 },
            );
            await gm.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.stamina.value === 3,
               { id: ids.effectActorId },
               { timeout: 1000 },
            );

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
