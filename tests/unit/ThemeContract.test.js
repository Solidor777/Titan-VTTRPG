import { describe, expect, it } from 'vitest';
import {
   THEME_COLOR_TOKENS,
   THEME_FONT_TOKENS,
   THEME_TOKEN_GROUPS,
   THEME_TOKEN_PAIRS,
   THEME_TOKENS,
} from '~/theme/ThemeTokenContract.js';
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';
import { fillMissingThemeTokens } from '~/theme/ValidateThemeData.js';

/** @type {RegExp} Matches a 6-digit hex color value. */
const HEX_COLOR = /^#[0-9a-f]{6}$/;

/** @type {object[]} Every built-in theme under test; every shipped built-in must be listed here. */
const BUILT_IN_THEMES = [
   HERITAGE_DARK,
   MACCHIATO,
   HERITAGE_LIGHT,
   CLEAN_NEUTRAL_LIGHT,
];

describe('ThemeTokenContract', () => {
   it('contract token list is the union of color and font tokens with no duplicates', () => {
      expect(THEME_TOKENS).toEqual([
         ...THEME_COLOR_TOKENS,
         ...THEME_FONT_TOKENS,
      ]);
      expect(new Set(THEME_TOKENS).size).toBe(THEME_TOKENS.length);
   });

   it('groups partition the contract exactly', () => {
      const grouped = Object.values(THEME_TOKEN_GROUPS).flat();
      expect([...grouped].sort()).toEqual([...THEME_TOKENS].sort());
   });

   it('built-in ids and modes are correct', () => {
      expect(BUILT_IN_THEMES.map((t) => t.id)).toEqual(
         [
            'heritage-dark',
            'macchiato',
            'heritage-light',
            'clean-neutral-light',
         ],
      );
      expect(BUILT_IN_THEMES.map((t) => t.dark)).toEqual([
         true,
         true,
         false,
         false,
      ]);
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

/**
 * Computes the WCAG 2.x relative luminance of a 6-digit hex color.
 * @param {string} hex - The color, e.g. '#1f2430'.
 * @returns {number} The relative luminance, 0 to 1.
 */
function luminance(hex) {
   const [r, g, b] = [
      1,
      3,
      5,
   ].map((index) => {
      const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
   });
   return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

describe.each(BUILT_IN_THEMES)('content links in built-in theme $id', (theme) => {
   // Algorithm: WCAG 2.x contrast ratio, (L1 + 0.05) / (L2 + 0.05); 4.5 is the AA threshold for body text.
   it('link text meets WCAG AA contrast against the link background', () => {
      const fg = luminance(theme.tokens['content-link-font-color']);
      const bg = luminance(theme.tokens['content-link-background']);
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
   });
});

describe('fillMissingThemeTokens', () => {
   it('fills tokens a saved custom theme predates from the built-in base for its scheme', () => {
      const saved = {
         id: 'custom-abc',
         name: 'Old Custom',
         dark: true,
         tokens: { 'app-background': '#000000' },
      };
      const filled = fillMissingThemeTokens(saved);
      expect(Object.keys(filled.tokens).sort()).toEqual([...THEME_TOKENS].sort());
      expect(filled.tokens['app-background']).toBe('#000000');
      expect(filled.tokens['content-link-background']).toBe(HERITAGE_DARK.tokens['content-link-background']);
      expect(fillMissingThemeTokens({
         ...saved,
         dark: false,
      }).tokens['content-link-background']).toBe(HERITAGE_LIGHT.tokens['content-link-background']);
   });

   it('returns a complete theme unchanged', () => {
      expect(fillMissingThemeTokens(MACCHIATO)).toBe(MACCHIATO);
   });
});
