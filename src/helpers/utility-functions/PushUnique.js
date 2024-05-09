/**
 * Adds an entry to the array, provided it is not already in the array.
 * @param {*[]}   array The array to add the entry to.
 * @param {*}     value The value to add to the array.
 * @returns {number}    Returns the index of the new object if it was added to the array.
 *                      Otherwise, returns -1.
 */
export default function pushUnique(array, value) {
   if (!array.includes(value) < 0) {
      return array.push(value);
   }

   return -1;
}
