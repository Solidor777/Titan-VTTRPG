import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
   getTargetConditionDifficulty,
   getTargetConditionModifierLabel,
   getTargetConditionModifiers,
   selectAttackTargetConditions,
   sumTargetRatingModifiers,
} from '~/check/types/attack-check/TargetConditionModifiers.js';

beforeAll(() => {
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
 * Computes the modifiers for a target with the given statuses at the given distance, the attacker's Melee and
 * Accuracy both at the given base and value.
 * @param {string[]} statuses - The target's condition ids.
 * @param {number|null} distance - The distance in spaces, or null without tokens.
 * @param {number} [base] - The attacker's base Melee and Accuracy.
 * @param {number} [value] - The attacker's current Melee and Accuracy.
 * @returns {TargetConditionModifier[]} The modifiers the target's conditions give.
 */
function modifiers(statuses, distance, base = 8, value = base) {
   return getTargetConditionModifiers({
      accuracy: {
         base,
         value,
      },
      distance,
      melee: {
         base,
         value,
      },
      statuses: new Set(statuses),
   });
}

/**
 * Builds a modifier.
 * @param {string} condition - The condition id.
 * @param {string} modifier - What it modifies: melee, accuracy or difficulty.
 * @param {number} value - The rating change, or the fixed Difficulty.
 * @returns {TargetConditionModifier} The modifier.
 */
function entry(condition, modifier, value) {
   return {
      condition,
      modifier,
      value,
   };
}

describe('getTargetConditionModifiers', () => {
   it('gives a target with no conditions no modifiers', () => {
      expect(modifiers([], 1)).toEqual([]);
   });

   it.each([
      0,
      1,
   ])('gives both ratings +¼ of base (rounded up) against a Prone target %i spaces away', (distance) => {
      expect(modifiers(['prone'], distance, 6)).toEqual([
         entry('prone', 'melee', 2),
         entry('prone', 'accuracy', 2),
      ]);
   });

   it('gives no bonus when a quarter of the base rounds to 0', () => {
      expect(modifiers(['prone'], 1, 0)).toEqual([]);
   });

   it.each([
      2,
      5,
      10,
   ])('gives nothing against a Prone target %i spaces away', (distance) => {
      expect(modifiers(['prone'], distance)).toEqual([]);
   });

   it.each([
      [
         11,
         8,
         8,
         -2,
      ],
      [
         21,
         8,
         8,
         -4,
      ],
      [
         31,
         8,
         8,
         -6,
      ],
      [
         21,
         3,
         3,
         -1,
      ],
      [
         31,
         8,
         3,
         -3,
      ],
   ])('at %i spaces, base %i, Accuracy %i: Accuracy changes by %i', (distance, base, value, change) => {
      expect(modifiers(['prone'], distance, base, value)).toEqual([entry('prone', 'accuracy', change)]);
   });

   it.each([
      [
         11,
         3,
         3,
      ],
      [
         21,
         8,
         0,
      ],
   ])('at %i spaces, base %i, Accuracy %i: no penalty (rounds to 0 or Accuracy is 0)', (distance, base, value) => {
      expect(modifiers(['prone'], distance, base, value)).toEqual([]);
   });

   it('gives no distance modifier without tokens to measure', () => {
      expect(modifiers(['prone'], null)).toEqual([]);
   });

   it('fixes the Difficulty at 2 against an Incapacitated target, with or without tokens', () => {
      expect(modifiers(['incapacitated'], null)).toEqual([entry('incapacitated', 'difficulty', 2)]);
      expect(modifiers([
         'prone',
         'incapacitated',
      ], 1)).toEqual([
         entry('prone', 'melee', 2),
         entry('prone', 'accuracy', 2),
         entry('incapacitated', 'difficulty', 2),
      ]);
   });
});

describe('target condition selection', () => {
   /** @type {TargetConditionModifier[]} Adjacent Prone and Incapacitated. */
   const all = [
      entry('prone', 'melee', 2),
      entry('prone', 'accuracy', 2),
      entry('incapacitated', 'difficulty', 2),
   ];

   it('sums one rating\'s modifiers', () => {
      expect(sumTargetRatingModifiers(all, 'melee')).toBe(2);
      expect(sumTargetRatingModifiers([], 'accuracy')).toBe(0);
   });

   it('keeps the attack\'s own rating and the Difficulty', () => {
      expect(selectAttackTargetConditions(all, 'melee')).toEqual([
         all[0],
         all[2],
      ]);
      expect(selectAttackTargetConditions(all, 'ranged')).toEqual([
         all[1],
         all[2],
      ]);
   });

   it('reads the fixed Difficulty, or null', () => {
      expect(getTargetConditionDifficulty(all)).toBe(2);
      expect(getTargetConditionDifficulty([all[0]])).toBeNull();
   });

   it('labels a rating modifier signed and a Difficulty plain', () => {
      expect(getTargetConditionModifierLabel(all[0])).toBe('LOCAL.prone.text: LOCAL.melee.text +2');
      expect(getTargetConditionModifierLabel(entry('prone', 'accuracy', -4)))
         .toBe('LOCAL.prone.text: LOCAL.accuracy.text -4');
      expect(getTargetConditionModifierLabel(all[2])).toBe('LOCAL.incapacitated.text: LOCAL.difficulty.text 2');
   });
});
