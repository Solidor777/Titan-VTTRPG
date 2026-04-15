/**
 * Returns the combination of arrays such that all values are unique.
 * Does not modify the original arrays.
 * Note that if any arrays have duplicate entries, those entries will not be
 * included in the returned result.
 * @param {*[]} [a=[]] - The destination array.
 * @param {*[]} [b=[]] - The source array.
 * @returns {*[]} Array containing all the unique entries of a and b.
 */
export default function mergeArrays(a = [], b = []) {
   return [
      ...new Set([
         ...a,
         ...b,
      ]),
   ]
}
