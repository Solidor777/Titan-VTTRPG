/**
 * Takes in a string and return it in camel-case.
 * @param {string} string - The string to camelize.
 * @returns {string} The inputted string in camel-case.
 */
export default function camelize(string) {
   return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) => {
      if (+match === 0) {
         return '';
      }
      return index === 0 ? match.toLowerCase() : match.toUpperCase();
   });
}
