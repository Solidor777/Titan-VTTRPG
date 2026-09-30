/**
 * Takes in a string and return it in camel-case. Whitespace runs are removed; every other character, including
 * digits, is kept. Any string with a non-whitespace character therefore camelizes to a non-blank string.
 * @param {string} string - The string to camelize.
 * @returns {string} The inputted string in camel-case.
 */
export default function camelize(string) {
   return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (/^\s+$/.test(match)) {
         return '';
      }
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
   });
}
