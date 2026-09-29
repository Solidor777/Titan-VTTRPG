import { describe, it, expect } from 'vitest';
import {
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_TYPES,
   MODIFIER_TYPE_PARAMETER_KEYS,
   TYPED_KEY_SELECTORS,
} from '~/system/ConditionalCheckModifierTypes.js';

describe('conditional check modifier type tables', () => {
   it('lists Advantage and Automatic Failure as modifier types and situation as a typed check selector', () => {
      expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain('advantage');
      expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain('automaticFailure');
      expect(TYPED_KEY_SELECTORS.conditionalCheckModifier).toContain('situation');
   });

   it('maps every check type only to known modifier types', () => {
      for (const modifierTypes of Object.values(CHECK_TYPE_MODIFIER_TYPES)) {
         for (const modifierType of modifierTypes) {
            expect(CONDITIONAL_CHECK_MODIFIER_TYPES).toContain(modifierType);
         }
      }
   });

   it('gives Resistance Checks no Training, Damage, or Healing and Attribute Checks no Damage or Healing', () => {
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('training');
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('damage');
      expect(CHECK_TYPE_MODIFIER_TYPES.resistance).not.toContain('healing');
      expect(CHECK_TYPE_MODIFIER_TYPES.attribute).not.toContain('damage');
      expect(CHECK_TYPE_MODIFIER_TYPES.attack).not.toContain('healing');
   });

   it('names a parameter for every summable modifier type', () => {
      for (const modifierType of CONDITIONAL_CHECK_MODIFIER_TYPES) {
         if (modifierType !== 'automaticFailure') {
            expect(MODIFIER_TYPE_PARAMETER_KEYS[modifierType]).toBeTypeOf('string');
         }
      }
   });
});
