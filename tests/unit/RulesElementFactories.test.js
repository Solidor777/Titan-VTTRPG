import { describe, it, expect } from 'vitest';
import createMulSumElement from '~/document/types/item/rules-element/MulSum.js';
import createSetSumElement from '~/document/types/item/rules-element/SetSum.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier.js';
import createImmunityElement, {
   createEmptyImmunities,
   IMMUNITY_SELECTORS,
} from '~/document/types/item/rules-element/Immunity.js';
import { CONDITION_IDS, buildConditionDefinitions } from '~/system/Conditions.js';

describe('rules-element factory defaults', () => {
   it('createMulSumElement returns the mulSum defaults with a uuid', () => {
      const element = createMulSumElement();
      expect(element).toMatchObject({
         operation: 'mulSum',
         selector: 'speed',
         key: 'stride',
         value: 0.5,
         rounding: 'up',
      });
      expect(typeof element.uuid).toBe('string');
      expect(element.uuid.length).toBeGreaterThan(0);
   });

   it('createSetSumElement returns the setSum defaults with a uuid', () => {
      const element = createSetSumElement();
      expect(element).toMatchObject({
         operation: 'setSum',
         selector: 'speed',
         key: 'stride',
         value: 0,
         mode: 'set',
      });
      expect(typeof element.uuid).toBe('string');
      expect(element.uuid.length).toBeGreaterThan(0);
   });

   it('createMulBaseElement defaults rounding to down', () => {
      const element = createMulBaseElement();
      expect(element).toMatchObject({
         operation: 'mulBase',
         selector: 'attribute',
         key: 'body',
         value: 2,
         rounding: 'down',
      });
      expect(typeof element.uuid).toBe('string');
   });

   it('preserves a provided uuid', () => {
      expect(createMulSumElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
      expect(createSetSumElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
      expect(createMulBaseElement({ uuid: 'fixed-uuid' }).uuid).toBe('fixed-uuid');
   });

   it('createConditionalCheckModifierElement narrows to no Skill by default', () => {
      expect(createConditionalCheckModifierElement()).toMatchObject({
         checkType: 'any',
         modifierType: 'damage',
         operation: 'conditionalCheckModifier',
         selector: 'any',
         skill: '',
      });
   });

   it('createImmunityElement defaults to immunity to the first condition', () => {
      expect(createImmunityElement({ uuid: 'fixed-uuid' })).toEqual({
         key: CONDITION_IDS[0],
         operation: 'immunity',
         selector: 'condition',
         uuid: 'fixed-uuid',
      });
   });

   it('offers condition and effect immunity', () => {
      expect(IMMUNITY_SELECTORS).toEqual([
         'condition',
         'effect',
      ]);
   });

   it('lists every condition id in definition order', () => {
      expect(CONDITION_IDS).toEqual(buildConditionDefinitions().map((condition) => condition.id));
   });

   it('builds empty immunities with one fresh Map per immunity selector', () => {
      /** @type {Record<string, Map>} One empty immunities object. */
      const immunities = createEmptyImmunities();
      expect(Object.keys(immunities)).toEqual([...IMMUNITY_SELECTORS]);
      for (const selector of IMMUNITY_SELECTORS) {
         expect(immunities[selector]).toBeInstanceOf(Map);
         expect(immunities[selector].size).toBe(0);
      }
      expect(createEmptyImmunities().condition).not.toBe(immunities.condition);
   });
});
