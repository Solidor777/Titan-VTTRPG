import localize from '~/helpers/utility-functions/Localize.js';
import formatString from '~/helpers/utility-functions/FormatString.js';

/**
 * @typedef {object} TextData Object containing the data for a Text object.
 * @property {string} text - Text to display.
 * @property {boolean} [localize] - Whether to localize the text. Assumed to be true if not provided.
 * @property {object|[string|number]} [format] - Arguments for formatting the string if appropriate.
 * */

/**
 * Calculates the string text to display from a string or Text object.
 * @param {string|TextData} textData - The string or text to calculate.
 * @returns {string} - The calculated string.
 */
export default function calculateText(textData) {
   let retVal = '';

   // If the content is valid
   if (textData) {
      // If the content is a string...
      if (typeof textData === 'string' && textData.length > 0) {

         // Localize the string.
         retVal = localize(textData);
      }

      // If the content is an object...
      else if (typeof textData.text === 'string' && textData.text.length > 0) {
         // Initialize the return value.
         retVal = textData.text;

         // Localize the string if not explicitly told otherwise.
         if (textData.localize !== false) {
            retVal = localize(retVal);
         }

         // Format the string if formatting arguments were provided.
         if (textData.format) {
            retVal = formatString(retVal, textData.format);
         }
      }
   }

   return retVal;
};
