import { THEME_COLOR_TOKENS, THEME_TOKENS } from '~/theme/ThemeTokenContract.js';
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';

/** @type {RegExp} Matches a 6- or 8-digit hex color value. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * @type {RegExp} Matches a safe font-family value. Brace and angle characters are rejected because
 * token values land verbatim in an injected <style> element; a value containing `}` could close the
 * declaration block and inject arbitrary CSS.
 */
const SAFE_FONT = /^[^{}<>;]+$/;

/** @type {number} The theme export format version this build reads and writes. */
export const THEME_FORMAT_VERSION = 1;

/** @type {Object<string, object>} Built-in themes addressable as import bases. */
const BUILT_IN_BASES = Object.freeze({
   'heritage-dark': HERITAGE_DARK,
   'heritage-light': HERITAGE_LIGHT,
   'macchiato': MACCHIATO,
   'clean-neutral-light': CLEAN_NEUTRAL_LIGHT,
});

/**
 * Validates and normalizes an imported theme payload onto the token contract. Missing tokens are
 * filled from the declared base theme; unknown tokens are dropped; the result is never half-applied.
 * @param {object} data - The parsed import payload.
 * @param {object} [options] - Validation options.
 * @param {function(string): (object | undefined)} [options.getBaseTheme] - Resolves a base theme by id;
 *    defaults to the built-in themes, keyed by the payload's dark flag when no base is declared.
 * @returns {{ ok: boolean, theme?: object, error?: string }} The normalized theme or a failure reason.
 */
export default function validateThemeData(data, { getBaseTheme } = {}) {
   if (typeof data !== 'object' || data === null) {
      return { ok: false, error: 'Theme data is not an object.' };
   }
   if (data.formatVersion !== THEME_FORMAT_VERSION) {
      return { ok: false, error: `Unsupported theme format version: ${data.formatVersion}.` };
   }
   if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      return { ok: false, error: 'Theme name must be a non-empty string.' };
   }
   if (typeof data.dark !== 'boolean') {
      return { ok: false, error: 'Theme dark flag must be a boolean.' };
   }
   if (typeof data.tokens !== 'object' || data.tokens === null) {
      return { ok: false, error: 'Theme tokens must be an object.' };
   }

   // Resolve the fill-from base theme for tokens the payload omits.
   const resolveBase = getBaseTheme ?? defaultBaseResolver;
   const base = resolveBase(data.base) ?? resolveBase(data.dark ? 'heritage-dark' : 'heritage-light');

   // Build the normalized token map: provided value if valid for its kind, else the base value.
   const tokens = {};
   for (const token of THEME_TOKENS) {
      const provided = data.tokens[token];
      const isColor = THEME_COLOR_TOKENS.includes(token);
      const validProvided = isColor
         ? (typeof provided === 'string' && HEX_COLOR.test(provided))
         : (typeof provided === 'string' && SAFE_FONT.test(provided));
      if (token in data.tokens && !validProvided && typeof provided === 'string' && provided.length > 0) {
         return {
            ok: false,
            error: `Invalid ${isColor ? 'color' : 'font'} value for token '${token}': ${provided}.`,
         };
      }
      tokens[token] = validProvided ? provided : base.tokens[token];
   }

   return {
      ok: true,
      theme: {
         id: `custom-${foundry.utils.randomID(8)}`,
         name: data.name.trim(),
         dark: data.dark,
         tokens,
      },
   };
}

/**
 * Default base-theme resolver over the built-in themes.
 * @param {string} id - The base theme id declared by the payload.
 * @returns {object | undefined} The matching built-in theme.
 */
function defaultBaseResolver(id) {
   return BUILT_IN_BASES[id];
}
