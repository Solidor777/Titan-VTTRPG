import { describe, expect, it } from 'vitest';
import buildThemeStylesheetText from '~/theme/BuildThemeStylesheetText.js';
import resolveActiveThemeId from '~/theme/ResolveActiveThemeId.js';
import validateThemeData from '~/theme/ValidateThemeData.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import { THEME_TOKENS } from '~/theme/ThemeTokenContract.js';

describe('buildThemeStylesheetText', () => {
   it('emits one :root rule with a --titan- declaration per token', () => {
      const css = buildThemeStylesheetText(HERITAGE_DARK);
      expect(css.startsWith(':root {')).toBe(true);
      expect(css.trim().endsWith('}')).toBe(true);
      expect(css).toContain('--titan-app-background: #262836;');
      expect(css).toContain("--titan-font-family-normal: 'Lato';");
      expect(css.match(/--titan-/g)).toHaveLength(THEME_TOKENS.length);
   });

   it('declares the tokens under a custom selector when one is given', () => {
      const css = buildThemeStylesheetText(HERITAGE_DARK, '.titan.themed.theme-dark');
      expect(css.startsWith('.titan.themed.theme-dark {')).toBe(true);
      expect(css).toContain('--titan-app-background: #262836;');
   });
});

describe('resolveActiveThemeId', () => {
   /** @type {object} Baseline resolution inputs shared by the cases below. */
   const base = {
      selectedThemeId: 'auto',
      prefersDark: true,
      defaultDarkThemeId: 'heritage-dark',
      defaultLightThemeId: 'heritage-light',
      themeExists: (id) => ['heritage-dark', 'heritage-light', 'macchiato', 'custom-1'].includes(id),
   };

   it('explicit selection wins when the theme exists', () => {
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'macchiato' })).toBe('macchiato');
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'custom-1', prefersDark: false })).toBe('custom-1');
   });

   it('auto resolves the world default matching the preferred scheme', () => {
      expect(resolveActiveThemeId(base)).toBe('heritage-dark');
      expect(resolveActiveThemeId({ ...base, prefersDark: false })).toBe('heritage-light');
   });

   it('a missing selected theme falls through to auto resolution', () => {
      expect(resolveActiveThemeId({ ...base, selectedThemeId: 'deleted-custom' })).toBe('heritage-dark');
   });

   it('a missing world default falls back to the built-in heritage themes', () => {
      const noDefaults = { ...base, defaultDarkThemeId: 'gone', defaultLightThemeId: 'gone' };
      expect(resolveActiveThemeId(noDefaults)).toBe('heritage-dark');
      expect(resolveActiveThemeId({ ...noDefaults, prefersDark: false })).toBe('heritage-light');
   });
});

describe('validateThemeData', () => {
   /** @type {object} A valid minimal import payload derived from Heritage Dark. */
   const valid = {
      formatVersion: 1,
      name: 'My Theme',
      dark: true,
      base: 'heritage-dark',
      tokens: { ...HERITAGE_DARK.tokens, 'app-background': '#101018' },
   };

   it('accepts a valid payload and normalizes it onto the contract', () => {
      const result = validateThemeData(valid);
      expect(result.ok).toBe(true);
      expect(result.theme.tokens['app-background']).toBe('#101018');
      expect(Object.keys(result.theme.tokens).sort()).toEqual([...THEME_TOKENS].sort());
      expect(result.theme.id).toMatch(/^custom-/);
   });

   it('fills missing tokens from the declared base and drops unknown tokens', () => {
      const sparse = { ...valid, tokens: { 'app-background': '#101018', bogus: '#ffffff' } };
      const result = validateThemeData(sparse);
      expect(result.ok).toBe(true);
      expect(result.theme.tokens['button-background']).toBe(HERITAGE_DARK.tokens['button-background']);
      expect('bogus' in result.theme.tokens).toBe(false);
   });

   it('rejects malformed payloads with a reason', () => {
      expect(validateThemeData(null).ok).toBe(false);
      expect(validateThemeData({ ...valid, formatVersion: 99 }).ok).toBe(false);
      expect(validateThemeData({ ...valid, name: '' }).ok).toBe(false);
      expect(validateThemeData({ ...valid, tokens: 'nope' }).ok).toBe(false);
      const badColor = { ...valid, tokens: { ...valid.tokens, 'app-background': 'red' } };
      expect(validateThemeData(badColor).ok).toBe(false);
      for (const result of [validateThemeData(null), validateThemeData({ ...valid, formatVersion: 99 })]) {
         expect(typeof result.error).toBe('string');
         expect(result.error.length).toBeGreaterThan(0);
      }
   });

   it('accepts 8-digit hex on import', () => {
      const alpha = { ...valid, tokens: { ...valid.tokens, 'app-background': '#10101880' } };
      expect(validateThemeData(alpha).ok).toBe(true);
   });
});
