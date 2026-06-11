/**
 * Moves an entry within an array using insertion-point semantics: `toIdx` is the slot in the
 * original array's frame that the entry should come to sit before (so a drop line drawn before
 * row N maps to `toIdx === N`, and `toIdx === array.length` appends). Returns a new array; the
 * input is not mutated.
 * @param {Array<*>} array - The source array.
 * @param {number} fromIdx - The current index of the entry to move.
 * @param {number} toIdx - The insertion point in the original array frame.
 * @returns {Array<*>} A new array with the entry repositioned.
 */
export default function moveArrayEntry(array, fromIdx, toIdx) {
   /** @type {Array<*>} A shallow working copy so the input array is left untouched. */
   const result = array.slice();

   /** @type {Array<*>} The single removed entry, captured for re-insertion. */
   const [moved] = result.splice(fromIdx, 1);

   /** @type {number} Removing an earlier entry shifts later insertion points left by one. */
   const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
   result.splice(insertAt, 0, moved);

   return result;
}
