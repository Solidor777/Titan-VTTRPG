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

   test('A4: previousTurn reverts the applied effect and replicates to the player client', async ({ browser }) => {
      await withClients(browser, { gm: 'E2E GM 1', player: 'E2E Player 1' }, async ({ gm, player }) => {
         await setWorldSetting(gm, 'autoApplyPersistentDamage', 'enabled');
         await setWorldSetting(gm, 'autoRevertPersistentDamage', 'enabled');

         const seed = {
            sceneName: 'A4 Scene',
            effectActor: buildTurnEffectActorData('A4 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A4 PD', 1)],
            otherActor: buildTurnEffectActorData('A4 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
            observerUserName: 'E2E Player 1',
         };
         const ids = await gm.evaluate(seedCombatEncounter, seed);

         try {
            const before = await gm.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // Forward: apply the persistent damage.
            await gm.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Backward: previousTurn reverts the damage.
            await gm.evaluate((combatId) => game.combats.get(combatId).previousTurn(), ids.combatId);
            await player.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before },
               { timeout: 15_000 },
            );
         }
         finally {
            await gm.evaluate(teardownCombatEncounter, ids);
         }
      });
   });

   test('A5: a non-best-owner GM advancing the turn triggers exactly one apply by the best owner', async ({ browser }) => {
      await withClients(browser, { gm1: 'E2E GM 1', gm2: 'E2E GM 2' }, async ({ gm1, gm2 }) => {
         // GM 1 is the first active GM → the best owner / sole applier. Pin the setting on it.
         await setWorldSetting(gm1, 'autoApplyPersistentDamage', 'enabled');

         // Confirm best-owner identity from GM 1's perspective.
         const gm1IsBestOwner = await gm1.evaluate(() => {
            const activeGMs = game.users.filter((u) => u.active && u.isGM);
            return activeGMs.length > 0 && activeGMs[0].id === game.user.id;
         });
         expect(gm1IsBestOwner, 'GM 1 must be the first active GM').toBe(true);

         const seed = {
            sceneName: 'A5 Scene',
            effectActor: buildTurnEffectActorData('A5 Effect Actor'),
            effectAbilities: [buildPersistentDamageAbilityData('A5 PD', 1)],
            otherActor: buildTurnEffectActorData('A5 Other Actor'),
            effectInitiative: 10,
            otherInitiative: 20,
         };
         const ids = await gm1.evaluate(seedCombatEncounter, seed);

         try {
            const before = await gm1.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );

            // GM 2 (NOT the best owner) advances the turn.
            await gm2.evaluate((combatId) => game.combats.get(combatId).nextTurn(), ids.combatId);

            // The effect is applied exactly once (before - 1), observed on GM 2's client (replicated).
            await gm2.waitForFunction(
               ({ id, expected }) => game.actors.get(id)?.system.resource.stamina.value === expected,
               { id: ids.effectActorId, expected: before - 1 },
               { timeout: 15_000 },
            );

            // Re-read on GM 1 to confirm no double-apply (still before - 1, not before - 2).
            const onGm1 = await gm1.evaluate(
               (id) => game.actors.get(id).system.resource.stamina.value,
               ids.effectActorId,
            );
            expect(onGm1).toBe(before - 1);
         }
         finally {
            await gm1.evaluate(teardownCombatEncounter, ids);
         }
      });
   });
});
