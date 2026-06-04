import { describe, it, expect } from 'vitest';
import calculateCheckResults, { createCheckResultsShape }
   from '~/check/CheckResults.js';
import createAttributeCheckParameters, { createAttributeCheckParametersShape }
   from '~/check/types/attribute-check/AttributeCheckParameters.js';
import calculateAttributeCheckResults, { createAttributeCheckResultsShape }
   from '~/check/types/attribute-check/AttributeCheckResults.js';
import createResistanceCheckParameters, { createResistanceCheckParametersShape }
   from '~/check/types/resistance-check/ResistanceCheckParameters.js';
import calculateResistanceCheckResults, { createResistanceCheckResultsShape }
   from '~/check/types/resistance-check/ResistanceCheckResults.js';
import createAttackCheckParameters, { createAttackCheckParametersShape }
   from '~/check/types/attack-check/AttackCheckParameters.js';
import calculateAttackCheckResults, { createAttackCheckResultsShape }
   from '~/check/types/attack-check/AttackCheckResults.js';
import createCastingCheckParameters, { createCastingCheckParametersShape }
   from '~/check/types/casting-check/CastingCheckParameters.js';
import calculateCastingCheckResults, { createCastingCheckResultsShape }
   from '~/check/types/casting-check/CastingCheckResults.js';
import createItemCheckParameters, { createItemCheckParametersShape }
   from '~/check/types/item-check/ItemCheckParameters.js';
import calculateItemCheckResults, { createItemCheckResultsShape }
   from '~/check/types/item-check/ItemCheckResults.js';
import { diceResults } from './check-test-helpers.js';

/**
 * A representative options object exposing every property the parameter factories read.
 * All values are set to their zero/false/'' defaults so the factory output can be compared
 * structurally to the shape — the key sets must be identical.
 */
const OPTIONS = {
   attribute: 'body',
   attackerAccuracy: 0,
   attackerMelee: 0,
   cleave: false,
   complexity: 0,
   damageMod: 0,
   damageToReduce: 0,
   diceMod: 0,
   difficulty: 0,
   doubleExpertise: false,
   doubleTraining: false,
   expertiseMod: 0,
   extraFailureOnCritical: false,
   extraSuccessOnCritical: false,
   flurry: false,
   healingMod: 0,
   ineffective: false,
   magical: false,
   multiAttack: false,
   penetrating: false,
   plusExtraSuccessDamage: false,
   range: 0,
   rend: false,
   resistance: 'reflexes',
   resolveCost: 0,
   skill: 'athletics',
   targetDefense: 0,
   trainingMod: 0,
   type: 'melee',
};

/** Parameter factory + shape pairs for all 5 check subtypes. */
const PARAM_CASES = [
   ['attribute', createAttributeCheckParameters, createAttributeCheckParametersShape],
   ['resistance', createResistanceCheckParameters, createResistanceCheckParametersShape],
   ['attack', createAttackCheckParameters, createAttackCheckParametersShape],
   ['casting', createCastingCheckParameters, createCastingCheckParametersShape],
   ['item', createItemCheckParameters, createItemCheckParametersShape],
];

describe('check parameter shape ↔ factory parity', () => {
   it.each(PARAM_CASES)('%s parameters: shape keys === factory keys', (_name, factory, shape) => {
      expect(Object.keys(factory(OPTIONS)).sort()).toEqual(Object.keys(shape()).sort());
   });
});

/**
 * Parameters object used when invoking result factories.
 * Includes every field consumed by any result factory, with
 * `difficulty: 4` and `complexity: 1` so the base engine can run.
 */
const RESULT_PARAMS = {
   ...OPTIONS,
   complexity: 1,
   damage: 0,
   damageToReduce: 0,
   difficulty: 4,
   healing: 0,
   isDamage: false,
   isHealing: false,
   opposedCheck: {
      attribute: '',
      enabled: false,
      skill: '',
   },
   scaling: false,
   scalingAspect: [],
};

/** Result factory + shape pairs for all 5 check subtypes. */
const RESULT_CASES = [
   ['attribute', calculateAttributeCheckResults, createAttributeCheckResultsShape],
   ['resistance', calculateResistanceCheckResults, createResistanceCheckResultsShape],
   ['attack', calculateAttackCheckResults, createAttackCheckResultsShape],
   ['casting', calculateCastingCheckResults, createCastingCheckResultsShape],
   ['item', calculateItemCheckResults, createItemCheckResultsShape],
];

describe('check result shape ↔ factory parity', () => {
   it('base results: shape keys === factory keys', () => {
      const params = { difficulty: 4, complexity: 1, extraSuccessOnCritical: false, extraFailureOnCritical: false };
      expect(Object.keys(calculateCheckResults(diceResults([6]), params)).sort())
         .toEqual(Object.keys(createCheckResultsShape()).sort());
   });

   it.each(RESULT_CASES)('%s results: shape keys === factory keys', (_name, factory, shape) => {
      expect(Object.keys(factory(diceResults([6, 5, 4]), RESULT_PARAMS)).sort())
         .toEqual(Object.keys(shape()).sort());
   });
});
