/**
 * Simple sort function used for arranging values objects in ascending order.
 * @param {*} a - First Value.
 * @param {*} b - Second value.
 * @returns {number} 1 if a > b. -1 if a < b. 0 if a = b.
 */
export default function sortLeast(a, b) {
   if (a > b) {
      return 1;
   }
   if (a < b) {
      return -1;
   }
   return 0;
}
