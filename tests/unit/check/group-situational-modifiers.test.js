import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import groupSituationalModifiers, {
   describeSituationalModifier,
} from '~/check/dialog/GroupSituationalModifiers.js';

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

describe('describeSituationalModifier', () => {
   it('names Advantage levels, Automatic Failure, and signed sums', () => {
      expect(describeSituationalModifier('advantage', -3)).toBe('LOCAL.greaterDisadvantage.text');
      expect(describeSituationalModifier('automaticFailure', 1)).toBe('LOCAL.automaticFailure.text');
      expect(describeSituationalModifier('dice', -1)).toBe('-1 LOCAL.dice.text');
      expect(describeSituationalModifier('damage', 2)).toBe('+2 LOCAL.damage.text');
   });
});

describe('groupSituationalModifiers', () => {
   it('groups modifiers by key in first-seen order with their descriptions and unique sources', () => {
      expect(groupSituationalModifiers([
         {
            key: 'underwater',
            label: 'Underwater',
            modifierType: 'dice',
            sources: ['Pool'],
            value: -1,
         },
         {
            key: 'jump',
            label: 'Jump',
            modifierType: 'automaticFailure',
            sources: ['Plate'],
            value: 1,
         },
         {
            key: 'underwater',
            label: 'Underwater',
            modifierType: 'advantage',
            sources: [
               'Pool',
               'Tide',
            ],
            value: -1,
         },
      ])).toEqual([
         {
            key: 'underwater',
            label: 'Underwater',
            modifiers: [
               '-1 LOCAL.dice.text',
               'LOCAL.disadvantage.text',
            ],
            sources: [
               'Pool',
               'Tide',
            ],
         },
         {
            key: 'jump',
            label: 'Jump',
            modifiers: ['LOCAL.automaticFailure.text'],
            sources: ['Plate'],
         },
      ]);
   });
});
