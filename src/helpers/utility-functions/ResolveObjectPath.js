/**
 * Takes in a string path to an object property, and returns the value of that property.
 * @param {object} obj - The object to retrieve the property value from.
 * @param {string} path - The path to the property value inside obj.
 * @returns {undefined|*} The value of the property inside obj with the corresponding path.
 */
export default function resolveObjectPath(obj, path) {
   const paths = path.split('.');
   let retVal = obj;
   for (const currentPath of paths) {
      if (typeof retVal !== 'object') {
         return undefined;
      }
      retVal = retVal[currentPath];
   }
   return retVal;
}
