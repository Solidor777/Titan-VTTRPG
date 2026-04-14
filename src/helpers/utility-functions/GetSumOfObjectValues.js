/**
 * Returns the sum of the key values contained within an object.
 * Assumed the object only contains numbers.
 * @param {object} object - Object to get the sum values of.
 * @returns {number} The sum of the values contained within the object.
 */
export default function getSumOfObjectValues(object) {
   let retVal = 0;
   for (const value of Object.values(object)) {
      retVal += value;
   }

   return retVal;
}
