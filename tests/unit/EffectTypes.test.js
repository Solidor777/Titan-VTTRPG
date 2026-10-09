import { describe, expect, it } from 'vitest';
import {
   BASE_TYPE,
   CONDITION_TYPE,
   EFFECT_TYPE,
   TITAN_EFFECT_TYPES,
   isBaseEffect,
   isListedEffect,
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

   it('names core\'s base subtype and accepts only it', () => {
      expect(BASE_TYPE).toBe('base');
      expect(isBaseEffect({ type: 'base' })).toBe(true);
      expect(isBaseEffect({ type: 'effect' })).toBe(false);
      expect(isBaseEffect({ type: 'condition' })).toBe(false);
      expect(isBaseEffect({ type: '' })).toBe(false);
   });

   it('lists the effect, condition and base subtypes and no other', () => {
      expect(isListedEffect({ type: 'effect' })).toBe(true);
      expect(isListedEffect({ type: 'condition' })).toBe(true);
      expect(isListedEffect({ type: 'base' })).toBe(true);
      expect(isListedEffect({ type: 'other' })).toBe(false);
      expect(isListedEffect({ type: '' })).toBe(false);
   });
});
