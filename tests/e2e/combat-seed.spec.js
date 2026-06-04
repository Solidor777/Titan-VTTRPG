import { expect, test } from '@playwright/test';
import { login } from './fixtures.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';
import { seedCombatEncounter, teardownCombatEncounter } from '../shared/combat.js';
import { buildTurnEffectActorData, buildPersistentDamageAbilityData } from '../shared/builders.js';

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

test.describe('combat seeding', () => {
   test('seeds two combatants whose actors resolve and produce >1 turn', async () => {
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
