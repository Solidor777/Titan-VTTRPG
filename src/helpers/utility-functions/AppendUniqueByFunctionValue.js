/**
 * Adds each entry from the source array to the destination array,
 * provided that said entry is not already in the destination array.
 * Uses a function to determine whether the object is already in the array
 * @param {object[]} destination The destination array.
 * @param {object[]} source      The source array
 * @param {Function} idFunction  The function to be applied to object from the source array to determine whether it is
 *                               already in the destination array. If another object in the destination array already
 *                               has the same return, the object will not be added to the destination array.
 */
export default function appendUniqueByFunctionValue(destination, source, idFunction) {
   for (const value of source) {
      if (!destination.some((entry) => idFunction(entry) === idFunction(value))) {
         destination.push(value);
      }
   }
}
