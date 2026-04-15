import localize from '~/helpers/utility-functions/Localize.js';
import formatString from '~/helpers/utility-functions/FormatString.js';

/**
 * @typedef {object} TextData Object containing the data for a Text object.
 * @property {string|number} text The string or number to display.
 * @property {boolean} [localize] Whether to localize the text. Assumed to be
 *    true if not provided.
 * @property {*[]} [formattingArgs] Arguments for formatting the string if
 *    appropriate.
 * */

/**
 * Calculates the string text to display from a string or Text object.
 * @param {string|number|TextData} textData - The string or text to calculate.
 * @returns {string} The calculated string.
 */
export default function processTextData(textData) {
   /** @type {string} */
   let retVal = '';

   // If the content is valid
   if (textData) {
      switch (typeof textData) {
         // If the content is a string...
         case 'string': {
            // Localize the string.
            if (textData.length > 0) {
               retVal = localize(textData);
            }

            break;
         }

         // If the content is a number...
         case 'number': {
            // Return the number as a string.
            retVal = textData.toString();

            break;
         }

         // If the content is an object...
         case 'object': {
            switch (typeof textData.text) {

               // If the text is a string...
               case 'string': {
                  // Initialize the return value.
                  retVal = textData.text;

                  // Localize the string if not explicitly told otherwise.
                  if (textData.localize !== false) {
                     retVal = localize(retVal);
                  }

                  // Format the string if formatting arguments were provided.
                  if (textData.format) {
                     retVal = formatString(retVal, textData.formattingArgs);
                  }
               }
                  break;

               // If the text is a number...
               case 'number': {
                  retVal = textData.text.toString();
                  break;
               }

               default: {
                  break;
               }
            }

            break;
         }
      }
   }

   return retVal;
}
