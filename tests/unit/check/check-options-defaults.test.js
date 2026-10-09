import { describe, it, expect } from 'vitest';
import createAttackCheckOptions from '~/check/types/attack-check/AttackCheckOptions.js';
import createAttributeCheckOptions from '~/check/types/attribute-check/AttributeCheckOptions.js';
import createCastingCheckOptions from '~/check/types/casting-check/CastingCheckOptions.js';
import createItemCheckOptions from '~/check/types/item-check/ItemCheckOptions.js';
import createResistanceCheckOptions from '~/check/types/resistance-check/ResistanceCheckOptions.js';

/** @type {Array<[string, Function]>} Every check type's options factory. */
const FACTORIES = [
   [
      'attribute',
      createAttributeCheckOptions,
   ],
   [
      'resistance',
      createResistanceCheckOptions,
   ],
   [
      'attack',
      createAttackCheckOptions,
   ],
   [
      'casting',
      createCastingCheckOptions,
   ],
   [
      'item',
      createItemCheckOptions,
   ],
];

describe('check options — Advantage, Automatic Failure, situations', () => {
   it.each(FACTORIES)('%s options default to no Advantage, no Automatic Failure, no situations', (_name, factory) => {
      expect(factory({})).toMatchObject({
         advantage: 0,
         automaticFailure: false,
         situations: [],
      });
   });

   it.each(FACTORIES)('%s options keep supplied values', (_name, factory) => {
      expect(factory({
         advantage: -3,
         automaticFailure: true,
         situations: ['underwater'],
      })).toMatchObject({
         advantage: -3,
         automaticFailure: true,
         situations: ['underwater'],
      });
   });
});

describe('attack options — target conditions', () => {
   it('default to none and keep supplied ones', () => {
      expect(createAttackCheckOptions({}).targetConditions).toEqual([]);

      /** @type {TargetConditionModifier[]} A caller's Incapacitated Difficulty modifier. */
      const targetConditions = [
         {
            condition: 'incapacitated',
            modifier: 'difficulty',
            value: 2,
         },
      ];
      expect(createAttackCheckOptions({ targetConditions }).targetConditions).toEqual(targetConditions);
   });
});
