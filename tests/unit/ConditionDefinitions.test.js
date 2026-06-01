import { describe, it, expect } from 'vitest';
import { buildConditionDefinitions } from '~/system/Conditions.js';

/**
 * Returns the condition definition with the given id from buildConditionDefinitions().
 * @param {string} id - The condition id.
 * @returns {object} The matching definition.
 */
function def(id) {
   return buildConditionDefinitions().find((condition) => condition.id === id);
}

describe('buildConditionDefinitions', () => {
   it('marks every condition as the condition subtype', () => {
      for (const condition of buildConditionDefinitions()) {
         expect(condition.type, `${condition.id} should be the condition subtype`).toBe('condition');
      }
   });

   it('seeds blinded with -1 to melee, accuracy, and defense ratings', () => {
      expect(def('blinded').system.rulesElement).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'melee',
            value: -1,
            uuid: 'condition-blinded-melee',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'accuracy',
            value: -1,
            uuid: 'condition-blinded-accuracy',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: -1,
            uuid: 'condition-blinded-defense',
         },
      ]);
   });

   it('seeds contaminated with -1 to all attributes and all resistances', () => {
      expect(def('contaminated').system.rulesElement).toEqual([
         {
            operation: 'flatModifier',
            selector: 'attribute',
            key: 'all',
            value: -1,
            uuid: 'condition-contaminated-attributes',
         },
         {
            operation: 'flatModifier',
            selector: 'resistance',
            key: 'all',
            value: -1,
            uuid: 'condition-contaminated-resistances',
         },
      ]);
   });

   it('seeds stunned with -1 defense', () => {
      expect(def('stunned').system.rulesElement).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: -1,
            uuid: 'condition-stunned-defense',
         },
      ]);
   });

   it('seeds prone with halved speed (round up) plus -1 melee/accuracy', () => {
      expect(def('prone').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'speed',
            key: 'all',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-prone-speed',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'melee',
            value: -1,
            uuid: 'condition-prone-melee',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'accuracy',
            value: -1,
            uuid: 'condition-prone-accuracy',
         },
      ]);
   });

   it('seeds restrained with -1 melee/accuracy/defense plus speed set to 0', () => {
      expect(def('restrained').system.rulesElement).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'melee',
            value: -1,
            uuid: 'condition-restrained-melee',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'accuracy',
            value: -1,
            uuid: 'condition-restrained-accuracy',
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: -1,
            uuid: 'condition-restrained-defense',
         },
         {
            operation: 'setSum',
            selector: 'speed',
            key: 'all',
            value: 0,
            mode: 'set',
            uuid: 'condition-restrained-speed',
         },
      ]);
   });

   it('seeds sleeping with halved awareness (round up)', () => {
      expect(def('sleeping').system.rulesElement).toEqual([
         {
            operation: 'mulSum',
            selector: 'rating',
            key: 'awareness',
            value: 0.5,
            rounding: 'up',
            uuid: 'condition-sleeping-awareness',
         },
      ]);
   });

   it('leaves mechanically-inert conditions without rules elements', () => {
      for (const id of ['dead', 'deafened', 'frightened', 'incapacitated', 'unconscious']) {
         expect(def(id).system, `${id} should have no system.rulesElement`).toBeUndefined();
      }
   });
});
