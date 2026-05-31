import { describe, it, expect } from 'vitest';
import calculateAttributeCheckResults from '~/check/types/attribute-check/AttributeCheckResults.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/ResistanceCheckResults.js';
import calculateAttackCheckResults from '~/check/types/attack-check/AttackCheckResults.js';
import calculateItemCheckResults from '~/check/types/item-check/ItemCheckResults.js';
import { diceResults } from './check-test-helpers.js';

describe('attribute & resistance results — damageTaken', () => {
   it('reduces incoming damage by the number of successes on a failed check', () => {
      const params = {
         difficulty: 4,
         complexity: 5,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damageToReduce: 5,
      };
      const r = calculateAttributeCheckResults(diceResults([5, 4, 2]), params);
      expect(r.succeeded).toBe(false);
      expect(r.successes).toBe(2);
      expect(r.damageTaken).toBe(3);
   });

   it('takes no damage on a successful resistance check', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damageToReduce: 5,
      };
      const r = calculateResistanceCheckResults(diceResults([5, 4, 2]), params);
      expect(r.succeeded).toBe(true);
      expect(r.damageTaken).toBe(0);
   });
});

describe('attack results — damage', () => {
   it('deals base damage plus mod on success', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: false,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4]), params);
      expect(r.damage).toBe(4);
   });

   it('adds extra-success damage when plusExtraSuccessDamage is set', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: true,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4, 5]), params);
      expect(r.extraSuccesses).toBe(2);
      expect(r.damage).toBe(6);
   });

   it('deals no damage on failure', () => {
      const params = {
         difficulty: 4,
         complexity: 5,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 3,
         damageMod: 1,
         plusExtraSuccessDamage: false,
      };
      const r = calculateAttackCheckResults(diceResults([5, 4]), params);
      expect(r.damage).toBe(0);
   });
});

describe('item results — damage scaling and opposed complexity', () => {
   it('scales damage with extra successes when scaling is enabled', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 2,
         damageMod: 1,
         healing: 0,
         scaling: true,
         opposedCheck: false,
      };
      const r = calculateItemCheckResults(diceResults([5, 4, 5]), params);
      expect(r.extraSuccesses).toBe(2);
      expect(r.damage).toBe(5);
   });

   it('sets opposed-check complexity to 1 + extra successes', () => {
      const params = {
         difficulty: 4,
         complexity: 1,
         extraSuccessOnCritical: false,
         extraFailureOnCritical: false,
         damage: 0,
         damageMod: 0,
         healing: 0,
         scaling: false,
         opposedCheck: true,
      };
      const r = calculateItemCheckResults(diceResults([5, 4, 5]), params);
      expect(r.opposedCheckComplexity).toBe(3);
   });
});
