import { describe, expect, it } from 'vitest';
import {
   THEME_COLOR_TOKENS,
   THEME_FONT_TOKENS,
   THEME_TOKEN_GROUPS,
   THEME_TOKEN_PAIRS,
   THEME_TOKENS,
} from '~/theme/ThemeTokenContract.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';

/** @type {RegExp} Matches a 6-digit hex color value. */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** @type {object[]} Every built-in theme under test; every shipped built-in must be listed here. */
const BUILT_IN_THEMES = [HERITAGE_DARK];

describe('ThemeTokenContract', () => {
   it('contract token list is the union of color and font tokens with no duplicates', () => {
      expect(THEME_TOKENS).toEqual([...THEME_COLOR_TOKENS, ...THEME_FONT_TOKENS]);
      expect(new Set(THEME_TOKENS).size).toBe(THEME_TOKENS.length);
   });

   it('groups partition the contract exactly', () => {
      const grouped = Object.values(THEME_TOKEN_GROUPS).flat();
      expect([...grouped].sort()).toEqual([...THEME_TOKENS].sort());
   });

   it('every pair references contract tokens', () => {
      for (const [background, foreground] of THEME_TOKEN_PAIRS) {
         expect(THEME_COLOR_TOKENS, `pair bg ${background}`).toContain(background);
         expect(THEME_COLOR_TOKENS, `pair fg ${foreground}`).toContain(foreground);
      }
   });
});

describe.each(BUILT_IN_THEMES)('built-in theme $id', (theme) => {
   it('declares id, name, dark, and frozen tokens', () => {
      expect(typeof theme.id).toBe('string');
      expect(typeof theme.name).toBe('string');
      expect(typeof theme.dark).toBe('boolean');
      expect(Object.isFrozen(theme.tokens)).toBe(true);
   });

   it('defines exactly the contract tokens', () => {
      expect(Object.keys(theme.tokens).sort()).toEqual([...THEME_TOKENS].sort());
   });

   it('every color token is 6-digit hex; every font token is a non-empty string', () => {
      for (const token of THEME_COLOR_TOKENS) {
         expect(theme.tokens[token], token).toMatch(HEX_COLOR);
      }
      for (const token of THEME_FONT_TOKENS) {
         expect(typeof theme.tokens[token], token).toBe('string');
         expect(theme.tokens[token].length, token).toBeGreaterThan(0);
      }
   });

   it('every fill token has its paired text token (no white-on-saturated rule)', () => {
      for (const [background, foreground] of THEME_TOKEN_PAIRS) {
         expect(theme.tokens[background], background).toBeDefined();
         expect(theme.tokens[foreground], foreground).toBeDefined();
      }
   });
});
