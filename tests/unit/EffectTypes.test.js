import { describe, expect, it } from 'vitest';
import {
   CONDITION_TYPE,
   EFFECT_TYPE,
   TITAN_EFFECT_TYPES,
   isTitanEffect,
} from '~/system/EffectTypes.js';

describe('TITAN effect types', () => {
   it('names the effect and condition subtypes', () => {
      expect(EFFECT_TYPE).toBe('effect');
      expect(CONDITION_TYPE).toBe('condition');
      expect(TITAN_EFFECT_TYPES).toEqual([
         'effect',
         'condition',
      ]);
   });

   it('accepts an effect and a condition and rejects any other subtype', () => {
      expect(isTitanEffect({ type: 'effect' })).toBe(true);
      expect(isTitanEffect({ type: 'condition' })).toBe(true);
      expect(isTitanEffect({ type: 'base' })).toBe(false);
      expect(isTitanEffect({ type: '' })).toBe(false);
   });
});
