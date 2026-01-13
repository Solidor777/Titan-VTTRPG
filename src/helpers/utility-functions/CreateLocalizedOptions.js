import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Helper function for create a localized list of options that can be used in a select object.
 * @param {string[]} list - List of options to localize.
 * @return {StringOption[]} - Localized options matched to their values.
 */
export default function createLocalizedOptions (list) {
   let retVal = [];
   for (const entry of list) {
      retVal.push({
         value: localize(entry),
         label: entry,
      });
   }
   
   return retVal;
}
