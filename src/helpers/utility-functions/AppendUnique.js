/**
 * Adds each entry from the source array to the destination array,
 * provided that said entry is not already in the destination array.
 * @param {*[]}   destination    The destination array.
 * @param {*[]}   source         The source array
 */
export default function appendUnique(destination, source) {
   for (const value of source) {
      if (!destination.includes(value) < 0) {
         destination.push(value);
      }
   }
}
