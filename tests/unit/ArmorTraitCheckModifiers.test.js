import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import camelize from '~/helpers/utility-functions/Camelize.js';
import createArmorTraitCheckModifiers from '~/document/types/item/types/armor/ArmorTraitCheckModifiers.js';

/** @type {object} The stand-in game.i18n whose localize() each test swaps. */
const i18n = {
   localize: (key) => key,
};

beforeAll(() => {
   // localize() reads game.i18n at call time.
   globalThis.game = { i18n };
});

afterAll(() => {
   delete globalThis.game;
});

/** @type {Record<string, string>} The canonical, locale-independent situation source strings by label key. */
const CANONICAL = {
   situationJump: 'Jump',
   situationRemainUndetectedByHearing: 'Remain Undetected by Hearing',
   situationSwimFlyClimb: 'Swim, Fly, or Climb',
};

/**
 * Builds the expected synthetic element.
 * @param {string} trait - The armor trait.
 * @param {string} modifierType - What the element changes (e.g. `difficulty` or `automaticFailure`).
 * @param {number} value - The element value.
 * @param {string} labelKey - The situation label's localization key.
 * @param {string} skill - The Skill narrowing ('' = any).
 * @returns {object} The expected element.
 */
function expected(trait, modifierType, value, labelKey, skill) {
   // The stand-in localize() returns the LOCAL key, so the label is that key itself.
   return {
      checkType: 'any',
      key: CANONICAL[labelKey],
      label: `LOCAL.${labelKey}.text`,
      labelKey,
      modifierType,
      operation: 'conditionalCheckModifier',
      selector: 'situation',
      skill,
      uuid: `armor-trait-${trait}-${labelKey}`,
      value,
   };
}

/** @type {object[]} A Heavy-only trait list. */
const HEAVY = [
   {
      name: 'heavy',
      value: true,
   },
];

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

   it('yields one element pair for a repeated trait entry', () => {
      expect(createArmorTraitCheckModifiers([
         {
            name: 'heavy',
            value: true,
         },
         {
            name: 'heavy',
            value: true,
         },
      ])).toHaveLength(2);
   });

   it('keeps keys identical across languages while the label follows the language', () => {
      /** @type {Function} The localize stand-in restored after the test. */
      const original = i18n.localize;
      /** @type {object[]} The elements built under English. */
      const english = createArmorTraitCheckModifiers(HEAVY);

      /** @type {object[]} The elements built under a stand-in translation. */
      let translated;
      try {
         i18n.localize = (key) => `translated ${key}`;
         translated = createArmorTraitCheckModifiers(HEAVY);
      }
      finally {
         i18n.localize = original;
      }
      expect(translated.map((element) => camelize(element.key))).toEqual(
         english.map((element) => camelize(element.key)),
      );
      expect(translated.map((element) => element.label)).not.toEqual(english.map((element) => element.label));
   });
});
