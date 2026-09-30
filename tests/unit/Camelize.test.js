import { describe, it, expect } from 'vitest';
import camelize from '../../src/helpers/utility-functions/Camelize.js';

// Locks camelize's contract: whitespace is stripped, every digit is kept (a literal 0 is not whitespace), and
// punctuation is preserved because cache builders and lookups on both sides share this exact output.
describe('camelize', () => {
   it('keeps a lone 0', () => {
      expect(camelize('0')).toBe('0');
   });

   it('keeps a 0 that starts a word', () => {
      expect(camelize('Level 0 Ward')).toBe('level0Ward');
   });

   it('keeps a 0 that ends a word', () => {
      expect(camelize('Rank 10')).toBe('rank10');
   });

   it('keeps a multi-digit word that starts with a digit', () => {
      expect(camelize('10 Foot Pole')).toBe('10FootPole');
   });

   it('strips leading, trailing, and repeated spaces', () => {
      expect(camelize('  a b  ')).toBe('AB');
      expect(camelize('a  b')).toBe('aB');
      expect(camelize('Field   Medicine')).toBe('fieldMedicine');
   });

   it('returns an empty string for whitespace only', () => {
      expect(camelize(' ')).toBe('');
      expect(camelize('   ')).toBe('');
   });

   it('preserves punctuation', () => {
      expect(camelize('Swim, Fly, or Climb')).toBe('swim,Fly,OrClimb');
   });

   it('camelizes typical keys', () => {
      expect(camelize('Field Medicine')).toBe('fieldMedicine');
      expect(camelize('Fire')).toBe('fire');
   });
});
