import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import createArmorTraitCheckModifiers from '~/document/types/item/types/armor/ArmorTraitCheckModifiers.js';

beforeAll(() => {
   // localize() reads game.i18n at call time; the pass-through stand-in makes each label its LOCAL key.
   globalThis.game = {
      i18n: {
         localize: (key) => key,
      },
   };
});

afterAll(() => {
   delete globalThis.game;
});

/**
 * Builds the expected synthetic element.
 * @param {string} trait - The armor trait.
 * @param {string} modifierType - The modifier type.
 * @param {number} value - The element value.
 * @param {string} labelKey - The situation label's localization key.
 * @param {string} skill - The Skill narrowing ('' = any).
 * @returns {object} The expected element.
 */
function expected(trait, modifierType, value, labelKey, skill) {
   // The stand-in localize() returns the key, so the label is the LOCAL key itself.
   return {
      checkType: 'any',
      key: `LOCAL.${labelKey}.text`,
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

describe('createArmorTraitCheckModifiers', () => {
   it('gives Heavy Athletics Greater Disadvantage to Swim, Fly, or Climb and Automatic Failure on Jumps', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'heavy',
            value: true,
         },
      ])).toEqual([
         expected('heavy', 'advantage', -2, 'situationSwimFlyClimb', 'athletics'),
         expected('heavy', 'automaticFailure', 1, 'situationJump', 'athletics'),
      ]);
   });

   it('gives Encumbering Athletics-narrowed Disadvantage to Swim, Fly, or Climb', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'encumbering',
            value: true,
         },
      ])).toEqual([expected('encumbering', 'advantage', -1, 'situationSwimFlyClimb', 'athletics')]);
   });

   it('gives Loud Stealth-narrowed Disadvantage to remaining undetected by hearing', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'loud',
            value: true,
         },
      ])).toEqual([expected('loud', 'advantage', -1, 'situationRemainUndetectedByHearing', 'stealth')]);
   });

   it('adds nothing for armor without check traits, and orders Heavy, Encumbering, Loud', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'magical',
            value: true,
         },
      ])).toEqual([]);
      expect(createArmorTraitCheckModifiers([
         {
            name: 'loud',
            value: true,
         },
         {
            name: 'heavy',
            value: true,
         },
      ]).map((element) => element.uuid)).toEqual([
         'armor-trait-heavy-situationSwimFlyClimb',
         'armor-trait-heavy-situationJump',
         'armor-trait-loud-situationRemainUndetectedByHearing',
      ]);
   });
});
