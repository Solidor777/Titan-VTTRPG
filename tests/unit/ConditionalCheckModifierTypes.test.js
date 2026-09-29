import { describe, it, expect } from 'vitest';
import {
   CHECK_TYPE_CONDITIONAL_SELECTORS,
   CHECK_TYPE_MODIFIER_TYPES,
   CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS,
   CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS,
   CONDITIONAL_CHECK_MODIFIER_TYPES,
   MODIFIER_TYPE_PARAMETER_KEYS,
   TYPED_KEY_SELECTORS,
} from '~/system/ConditionalCheckModifierTypes.js';

/**
 * Gets the element check types some check reads, from the lookup table: `any` and each check type with its own entry.
 * @returns {string[]} The element check types, sorted.
 */
function getReadElementCheckTypes() {
   return [...new Set(Object.values(CHECK_TYPE_CONDITIONAL_SELECTORS).flatMap((cells) => Object.keys(cells)))].sort();
}

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

   it('keys the check-type lookups by the same check types', () => {
      expect(Object.keys(CHECK_TYPE_CONDITIONAL_SELECTORS).sort())
         .toEqual(Object.keys(CHECK_TYPE_MODIFIER_TYPES).sort());
   });
});

describe('conditional check modifier editor options', () => {
   it('offers exactly the element check types some check reads', () => {
      expect(CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS.map((option) => option.value).sort())
         .toEqual(getReadElementCheckTypes());
   });

   it('offers `any` and otherwise only check types that name the modifier types they read', () => {
      for (const { value } of CONDITIONAL_CHECK_MODIFIER_CHECK_TYPE_OPTIONS) {
         expect(value === 'any' || Object.hasOwn(CHECK_TYPE_MODIFIER_TYPES, value), value).toBe(true);
      }
   });

   it('keys the selector options by the offered check types', () => {
      expect(Object.keys(CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS).sort()).toEqual(getReadElementCheckTypes());
   });

   it.each(getReadElementCheckTypes())('offers for %s every selector a check reads under it, and situation', (type) => {
      /** @type {Set<string>} The selectors any check reads under the element check type, plus `situation`. */
      const read = new Set(['situation']);
      for (const cells of Object.values(CHECK_TYPE_CONDITIONAL_SELECTORS)) {
         for (const selector of cells[type] ?? []) {
            read.add(selector);
         }
      }
      expect([...CONDITIONAL_CHECK_MODIFIER_SELECTOR_OPTIONS[type]].sort()).toEqual([...read].sort());
   });
});
