import { describe, it, expect } from 'vitest';
import applyAdvantage, {
   ADVANTAGE_ELEMENT_LEVEL_OPTIONS,
   ADVANTAGE_LEVEL_OPTIONS,
   clampAdvantage,
   getAdvantageLabel,
} from '~/check/ApplyAdvantage.js';

describe('applyAdvantage', () => {
   it.each([
      {
         difficulty: 4,
         advantage: 0,
         expected: 4,
      },
      {
         difficulty: 4,
         advantage: 1,
         expected: 3,
      },
      {
         difficulty: 4,
         advantage: 2,
         expected: 2,
      },
      {
         difficulty: 4,
         advantage: 3,
         expected: 2,
      },
      {
         difficulty: 3,
         advantage: 2,
         expected: 2,
      },
      {
         difficulty: 2,
         advantage: 1,
         expected: 2,
      },
      {
         difficulty: 1,
         advantage: 1,
         expected: 1,
      },
      {
         difficulty: 7,
         advantage: 1,
         expected: 6,
      },
      {
         difficulty: 4,
         advantage: -1,
         expected: 5,
      },
      {
         difficulty: 4,
         advantage: -2,
         expected: 6,
      },
      {
         difficulty: 4,
         advantage: -5,
         expected: 6,
      },
      {
         difficulty: 5,
         advantage: -2,
         expected: 6,
      },
      {
         difficulty: 6,
         advantage: -1,
         expected: 6,
      },
      {
         difficulty: 7,
         advantage: -1,
         expected: 7,
      },
      {
         difficulty: 1,
         advantage: -1,
         expected: 2,
      },
   ])('Difficulty $difficulty with Advantage $advantage becomes $expected', ({ difficulty, advantage, expected }) => {
      expect(applyAdvantage(difficulty, advantage)).toBe(expected);
   });
});

describe('clampAdvantage and getAdvantageLabel', () => {
   it('caps a summed Advantage at Greater in either direction', () => {
      expect(clampAdvantage(-3)).toBe(-2);
      expect(clampAdvantage(3)).toBe(2);
      expect(clampAdvantage(1)).toBe(1);
   });

   it('names the clamped level', () => {
      expect(getAdvantageLabel(0)).toBe('noAdvantage');
      expect(getAdvantageLabel(-1)).toBe('disadvantage');
      expect(getAdvantageLabel(-5)).toBe('greaterDisadvantage');
      expect(getAdvantageLabel(1)).toBe('advantage');
      expect(getAdvantageLabel(4)).toBe('greaterAdvantage');
   });

   it('offers five dialog levels and the four non-zero element levels', () => {
      expect(ADVANTAGE_LEVEL_OPTIONS.map((option) => option.value)).toEqual([
         -2,
         -1,
         0,
         1,
         2,
      ]);
      expect(ADVANTAGE_ELEMENT_LEVEL_OPTIONS.map((option) => option.value)).toEqual([
         -2,
         -1,
         1,
         2,
      ]);
   });
});
