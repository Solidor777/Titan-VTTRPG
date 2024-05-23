/**
 * Returns an object with arrays of the inputted objects
 * mapped by the return value of a function applied to each object.
 * @param {object} objects - The objects being sorted.
 * @param {Function} sortFunction - The function to apply to the objects to
 * determine which array they should be sorted into.
 * @returns {object} Object holding arrays of the inputted objects,
 * sorted by the return value of the function when applied to them.
 */
export default function sortObjectsIntoContainerByFunctionValue(objects, sortFunction) {
   const retVal = {};

   // For each object
   for (const object of objects) {

      // Find the value of the function for this object
      const sortedKey = sortFunction(object);

      // If the array for the value of this object's key does not already exist in the retval,
      // then create the array and add it to the retval
      if (!retVal[sortedKey]) {
         retVal[sortedKey] = [];
      }

      // Add this object to the array for the value of this object's key
      retVal[sortedKey].push(object);
   }

   return retVal;
}
