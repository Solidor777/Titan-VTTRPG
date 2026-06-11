import buildThemeStylesheetText from '~/theme/BuildThemeStylesheetText.js';
import resolveActiveThemeId from '~/theme/ResolveActiveThemeId.js';
import validateThemeData, { THEME_FORMAT_VERSION } from '~/theme/ValidateThemeData.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';
import CLEAN_NEUTRAL_LIGHT from '~/theme/themes/CleanNeutralLight.js';
import HERITAGE_DARK from '~/theme/themes/HeritageDark.js';
import HERITAGE_LIGHT from '~/theme/themes/HeritageLight.js';
import MACCHIATO from '~/theme/themes/Macchiato.js';

/** @type {object[]} The built-in themes in picker order. */
export const BUILT_IN_THEMES = Object.freeze([HERITAGE_DARK, MACCHIATO, HERITAGE_LIGHT, CLEAN_NEUTRAL_LIGHT]);

/** @type {string} The DOM id of the injected theme stylesheet. */
const STYLE_ELEMENT_ID = 'titan-theme-style';

/**
 * @class ThemeManager
 * Resolves the active TITAN theme and injects its tokens as a :root stylesheet. Owns custom-theme
 * CRUD against the customThemes client setting, plus import/export. Created once during the init
 * hook and exposed as game.titan.themeManager.
 */
export default class ThemeManager {
   /** @type {MutationObserver | undefined} Observer re-applying the theme when Foundry's body scheme class flips. */
   #schemeObserver = void 0;

   /**
    * Applies the current theme and starts following Foundry's color-scheme body class for Auto mode.
    */
   initialize() {
      this.apply();

      // Foundry's configureUI() swaps theme-dark/theme-light on document.body; re-resolve on changes.
      this.#schemeObserver = new MutationObserver(() => this.apply());
      this.#schemeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
   }

   /**
    * Returns every available theme (built-ins first, then customs).
    * @returns {object[]} All themes.
    */
   getAllThemes() {
      return [...BUILT_IN_THEMES, ...Object.values(getSetting('customThemes') ?? {})];
   }

   /**
    * Looks up a theme by id.
    * @param {string} id - The theme id.
    * @returns {object | undefined} The theme, if known.
    */
   getTheme(id) {
      return this.getAllThemes().find((theme) => theme.id === id);
   }

   /**
    * Whether Foundry's resolved color scheme is dark. Falls back to the browser preference before
    * configureUI has classed the body.
    * @returns {boolean} True when the dark scheme is active.
    */
   prefersDark() {
      if (document.body.classList.contains('theme-dark')) {
         return true;
      }
      if (document.body.classList.contains('theme-light')) {
         return false;
      }

      return matchMedia('(prefers-color-scheme: dark)').matches;
   }

   /**
    * Resolves the active theme from settings and the current color scheme.
    * @returns {object} The active theme.
    */
   getActiveTheme() {
      // The resolved theme id from the pure resolution helper.
      const id = resolveActiveThemeId({
         selectedThemeId: getSetting('theme'),
         prefersDark: this.prefersDark(),
         defaultDarkThemeId: getSetting('defaultDarkTheme'),
         defaultLightThemeId: getSetting('defaultLightTheme'),
         themeExists: (themeId) => this.getTheme(themeId) !== undefined,
      });

      return this.getTheme(id);
   }

   /**
    * Builds and injects (or updates) the theme stylesheet for the active theme.
    */
   apply() {
      // The injected style element, created on first application.
      let style = document.getElementById(STYLE_ELEMENT_ID);
      if (!style) {
         style = document.createElement('style');
         style.id = STYLE_ELEMENT_ID;
         document.head.append(style);
      }
      style.textContent = buildThemeStylesheetText(this.getActiveTheme());
   }

   /**
    * Persists a custom theme (insert or update), refreshes the picker choices, and re-applies.
    * @param {object} theme - The custom theme to save.
    * @returns {Promise<void>} Resolves once the setting is stored.
    */
   async saveCustomTheme(theme) {
      // The stored custom themes map, updated immutably.
      const customThemes = { ...(getSetting('customThemes') ?? {}) };
      customThemes[theme.id] = theme;
      await game.settings.set('titan', 'customThemes', customThemes);
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Deletes a custom theme. The resolution helper falls back gracefully if it was active.
    * @param {string} id - The custom theme id to delete.
    * @returns {Promise<void>} Resolves once the setting is stored.
    */
   async deleteCustomTheme(id) {
      const customThemes = { ...(getSetting('customThemes') ?? {}) };
      delete customThemes[id];
      await game.settings.set('titan', 'customThemes', customThemes);
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Removes all custom themes and restores the theme selection to Auto.
    * @returns {Promise<void>} Resolves once both settings are stored.
    */
   async resetThemes() {
      await game.settings.set('titan', 'customThemes', {});
      await game.settings.set('titan', 'theme', 'auto');
      this.refreshThemeChoices();
      this.apply();
   }

   /**
    * Serializes a theme to its export JSON text.
    * @param {object} theme - The theme to export.
    * @returns {string} Pretty-printed JSON.
    */
   exportThemeText(theme) {
      return JSON.stringify(
         {
            formatVersion: THEME_FORMAT_VERSION,
            name: theme.name,
            dark: theme.dark,
            base: BUILT_IN_THEMES.some((builtIn) => builtIn.id === theme.id) ? theme.id : 'heritage-dark',
            tokens: theme.tokens,
         },
         null,
         2,
      );
   }

   /**
    * Validates import text and stores the resulting custom theme.
    * @param {string} text - The raw JSON text.
    * @returns {Promise<{ ok: boolean, theme?: object, error?: string }>} The validation result.
    */
   async importThemeText(text) {
      // The parsed payload; JSON syntax errors report as validation failures.
      let data;
      try {
         data = JSON.parse(text);
      }
      catch (error) {
         return { ok: false, error: `Invalid JSON: ${error.message}` };
      }

      const result = validateThemeData(data);
      if (result.ok) {
         await this.saveCustomTheme(result.theme);
      }

      return result;
   }

   /**
    * Rebuilds the registered theme setting's choices after custom themes change so the picker
    * reflects the current theme list.
    */
   refreshThemeChoices() {
      // The registered setting config whose choices are rebuilt in place.
      const config = game.settings.settings.get('titan.theme');
      if (config) {
         config.choices = buildThemeChoices(this.getAllThemes());
      }
   }
}

/**
 * Builds the choices map for the theme picker setting.
 * @param {object[]} themes - Every available theme.
 * @returns {Object<string, string>} Setting choices (id → display label).
 */
export function buildThemeChoices(themes) {
   // Auto first, then each theme by display name.
   const choices = { auto: 'SETTINGS.theme.auto' };
   for (const theme of themes) {
      choices[theme.id] = theme.name;
   }

   return choices;
}
