import { describe, expect, it } from 'vitest';
import {
   DURATION_CUSTOM,
   DURATION_INITIATIVE,
   DURATION_PERMANENT,
   DURATION_TURN_END,
   DURATION_TURN_START,
   DURATION_TYPES,
   TURN_DURATION_TYPES,
} from '~/system/DurationTypes.js';

describe('effect duration types', () => {
   it('names the five duration types', () => {
      expect(DURATION_TURN_END).toBe('turnEnd');
      expect(DURATION_TURN_START).toBe('turnStart');
      expect(DURATION_INITIATIVE).toBe('initiative');
      expect(DURATION_PERMANENT).toBe('permanent');
      expect(DURATION_CUSTOM).toBe('custom');
   });

   it('lists every duration type in the order the effect sheet offers them', () => {
      expect(DURATION_TYPES).toEqual([
         'turnEnd',
         'turnStart',
         'initiative',
         'permanent',
         'custom',
      ]);
   });

   it('lists the turn duration types, a subset of the duration types', () => {
      expect(TURN_DURATION_TYPES).toEqual([
         'turnStart',
         'turnEnd',
      ]);
      for (const type of TURN_DURATION_TYPES) {
         expect(DURATION_TYPES).toContain(type);
      }
   });

   it('freezes the lists', () => {
      expect(Object.isFrozen(DURATION_TYPES)).toBe(true);
      expect(Object.isFrozen(TURN_DURATION_TYPES)).toBe(true);
   });
});
