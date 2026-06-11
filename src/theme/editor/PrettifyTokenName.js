/**
 * Converts a theme token name to a human-readable label (e.g. 'app-background' → 'App Background').
 * Deliberately not localized: token names are the stable technical vocabulary of the theme format.
 * @param {string} token - The token name without the `--titan-` prefix.
 * @returns {string} The prettified label.
 */
export default function prettifyTokenName(token) {
   return token
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
}
