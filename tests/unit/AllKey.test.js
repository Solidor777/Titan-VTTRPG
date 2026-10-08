import { describe, expect, it } from 'vitest';
import { ALL_KEY } from '~/system/AllKey.js';

describe('the all key', () => {
   it('is the key a rules element uses to address every key under its selector', () => {
      expect(ALL_KEY).toBe('all');
   });
});
