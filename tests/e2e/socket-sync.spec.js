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

   test('A2: fast healing applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoApplyFastHealing', 'enabled');

         // Pre-seed stamina to 1 so a +2 heal is observable (heal is capped at max).
         const seed = {
            sceneName: 'A2 Scene',
            effectActor: buildTurnEffectActorData('A2 Effect Actor'),
            effectAbilities: [buildFastHealingAbilityData('A2 FH', 2)],
            otherActor: buildTurnEffectActorData('A2 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            staminaValue: 1,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Confirm the pre-seed landed on the player client.
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.stamina.value === 1,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );

            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Player observes the heal: 1 → 3 (1 + 2), assuming a base player stamina max >= 3.
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.stamina.value === 3,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });

   test('A3: resolve regain applied by the GM replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoRegainResolve', 'enabled');

         // Pre-spend resolve to 0 so a regain is observable (regain only raises a below-cap resource).
         // Expected post-regain: resolveBaseRegain (default 1) + mod.resolveRegain (1 from the ability)
         // = 2 total regained, clamped to resolve.max. Soul baseValue defaults to 1, so
         // resolve.max = Math.max(Math.ceil(1 * 0.5), 1) = 1. Result: Math.min(1, 0 + 2) = 1.
         const expectedResolve = 1;

         const seed = {
            sceneName: 'A3 Scene',
            effectActor: buildTurnEffectActorData('A3 Effect Actor'),
            effectAbilities: [buildResolveRegainAbilityData('A3 RR', 1)],
            otherActor: buildTurnEffectActorData('A3 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            resolveValue: 0,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            // Confirm the pre-seed (resolve = 0) has replicated to the player client.
            await player.waitForFunction(
               ({ id }) => game.actors.get(id)?.system.resource.resolve.value === 0,
               { id: ids.effectActorId },
               { timeout: 15_000 },
            );

            // GM (best owner) advances the turn → effect actor's turn starts → resolve regain applies.
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // Player observes the replicated resolve regain: 0 → 1 (clamped to resolve.max = 1).
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.resolve.value === expected,
               { id: ids.effectActorId, expected: expectedResolve },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
