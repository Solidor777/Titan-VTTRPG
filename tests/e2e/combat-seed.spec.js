import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildTurnEffectActorData, buildPersistentDamageAbilityData } from '../shared/builders.js';

test.describe('combat seeding', () => {
   test('seeds two combatants whose actors resolve and produce >1 turn', async ({ page }) => {
      await login(page, 'E2E GM 1');

      const seed = {
         sceneName: 'E2E Seed Scene',
         effectActor: buildTurnEffectActorData('E2E Effect Actor'),
         effectAbilities: [buildPersistentDamageAbilityData('E2E PD', 1)],
         otherActor: buildTurnEffectActorData('E2E Other Actor'),
         effectInitiative: 10,
         otherInitiative: 20,
      };

      const ids = await page.evaluate(seedCombatEncounter, seed);

      try {
         const probe = await page.evaluate((ids) => {
            const combat = game.combats.get(ids.combatId);
            const effectCombatant = combat.combatants.get(ids.effectCombatantId);
            return {
               turnCount: combat.turns.length,
               actorResolves: effectCombatant.actor?.id === ids.effectActorId,
               isCharacter: effectCombatant.actor?.system.isCharacter === true,
               characterCombatants: combat.getCharacterCombatants().length,
               startedTurn: combat.turn,
            };
         }, ids);

         expect(probe.turnCount).toBe(2);
         expect(probe.actorResolves, 'combatant.actor must resolve to the effect actor').toBe(true);
         expect(probe.isCharacter, 'effect actor must be a character').toBe(true);
         expect(probe.characterCombatants).toBe(2);
         expect(probe.startedTurn).toBe(0);
      }
      finally {
         await page.evaluate(teardownCombatEncounter, ids);
      }
   });
});
