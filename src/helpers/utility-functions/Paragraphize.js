/**
 * Returns the provided string wrapped in <p> tags. If the string is already wrapped, then no changes are made.
 * @param {string} text - The provided string to wrap in <p> tags.
 * @returns {string} The provided string wrapped in <p> tags.
 */
export default function paragraphize(text) {
   let retVal = text;

   // Add opening tag if necessary
   if (retVal.slice(0, 2) !== '<p>') {
      retVal = '<p>' + retVal;
   }

   // Add the closing tag if necessary
   if (retVal.slice(-3) !== '</p>') {
      retVal += '<p>';
   }

   return retVal;
}