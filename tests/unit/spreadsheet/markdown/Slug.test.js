import { describe, it, expect } from 'vitest';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';

describe('createSlugger', () => {
   it('lowercases and turns whitespace runs into a single hyphen', () => {
      const slugFor = createSlugger();
      expect(slugFor('Battle  Axe')).toBe('battle-axe');
   });

   it('strips characters outside [a-z0-9-]', () => {
      const slugFor = createSlugger();
      expect(slugFor('Weighted Gauntlet (+1)')).toBe('weighted-gauntlet-1');
   });

   it('collapses runs of hyphens produced by stripped characters', () => {
      const slugFor = createSlugger();
      expect(slugFor('A -- B')).toBe('a-b');
   });

   it('trims leading and trailing hyphens', () => {
      const slugFor = createSlugger();
      expect(slugFor('-Leading and Trailing-')).toBe('leading-and-trailing');
   });

   it('gives a repeated slug -1, -2, … suffixes in generation order', () => {
      const slugFor = createSlugger();
      expect(slugFor('Dagger')).toBe('dagger');
      expect(slugFor('Dagger')).toBe('dagger-1');
      expect(slugFor('Dagger')).toBe('dagger-2');
   });

   it('tracks collisions independently per slugger instance', () => {
      const first = createSlugger();
      const second = createSlugger();
      expect(first('Spear')).toBe('spear');
      expect(second('Spear')).toBe('spear');
   });
});
