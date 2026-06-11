/**
 * Builds the CSS text for a theme: one `:root` rule declaring every themed token as a `--titan-*`
 * custom property. Only TITAN styles consume the `--titan-` namespace, so scoping to `:root` cannot
 * affect Foundry core UI while still reaching chat notifications, popouts, and tooltips.
 * @param {import('~/theme/ThemeTokenContract.js').TitanTheme} theme - The theme to serialize.
 * @returns {string} The stylesheet text.
 */
export default function buildThemeStylesheetText(theme) {
   // One indented declaration line per token.
   const lines = Object.entries(theme.tokens).map(([token, value]) => `   --titan-${token}: ${value};`);

   return `:root {\n${lines.join('\n')}\n}`;
}
