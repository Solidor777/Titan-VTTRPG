/**
 * Builds the CSS text for a theme: one rule declaring every themed token as a `--titan-*` custom
 * property under the given selector. Only TITAN styles consume the `--titan-` namespace, so the
 * default `:root` scope cannot affect Foundry core UI while still reaching chat notifications,
 * popouts, and tooltips. A scoped selector overrides the tokens for a subtree, e.g. a sheet window
 * carrying Foundry's per-sheet `themed theme-light` classes.
 * @param {import('~/theme/ThemeTokenContract.js').TitanTheme} theme - The theme to serialize.
 * @param {string} [selector] - The CSS selector to declare the tokens under.
 * @returns {string} The stylesheet text.
 */
export default function buildThemeStylesheetText(theme, selector = ':root') {
   // One indented declaration line per token.
   const lines = Object.entries(theme.tokens).map(([token, value]) => `   --titan-${token}: ${value};`);

   return `${selector} {\n${lines.join('\n')}\n}`;
}
