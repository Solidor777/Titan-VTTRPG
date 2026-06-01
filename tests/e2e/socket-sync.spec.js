import { expect, test } from '@playwright/test';
import { withClients } from './multiClient.js';
import { setWorldSetting } from './settings.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import {
   buildTurnEffectActorData,
   buildPersistentDamageAbilityData,
   buildFastHealingAbilityData,
   buildResolveRegainAbilityData,
} from '../shared/builders.js';

test.describe('socket sync — replicated turn-effect state', () => {
   test('A1: persistent damage applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         // Determinism: auto-apply persistent damage on the applying (GM) client.
         await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');

         // Effect actor (lower initiative → turn 1) carries persistent damage 1; observer = the player.
         const seed = {
            sceneName: 'A1 Scene',
            effectActor: buildTurnEffectActorData('A1 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A1 PD', 1)],
            otherActor: buildTurnEffectActorData('A1 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Stamina starts at its full default (3 for a base player) — record the pre value on the GM.
            const before = await gm.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // GM (best owner) advances the turn → effect actor's turn starts → persistent damage applies.
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The PLAYER client observes the replicated stamina decrease (poll the document, no sleep).
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Confirm exactly-once: the value is before-1, not before-2.
            const after = await player.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );
            expect(after).toBe(before - 1);
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
