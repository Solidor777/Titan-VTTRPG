/**
 * Formats a string with the provided arguments.
 * @param {string} string - The string to format.
 * @param {...*} args - Arguments to format the string with.
 * @returns {string} The formatted string.
 */
export default function formatString(string, ...args) {
   // Initialize return value
   let retVal = string;

   // If arguments were provided
   if (string.length > 0 && args.length > 0) {

      // Cache the argument type
      let argType = typeof args[0];

      // If the args are strings or numbers
      if (argType === 'string' || argType === 'number') {

         // Replace the indexes of the arguments with the argument values
         for (const [key, value] of args.entries()) {
            retVal = retVal.replace(new RegExp('\\{' + key + '\\}', 'gi'), value.toString());
         }
      }

      // Otherwise, if the args is an object
      else if (argType === 'object') {
         // Replace the instances of the object keys with the object values for
         // those keys
         for (const [key, value] of Object.entries(args[0])) {
            retVal = retVal.replace(new RegExp('\\{' + key + '\\}', 'gi'), value.toString());
         }
      }
   }

   return retVal;
}
