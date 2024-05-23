/**
 * Capitalizes the first letter of the provided string.
 * @param {string} string - String to capitalize.
 * @returns {string} The capitalized string.
 */
export default function capitalize(string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
}
