import pushUnique from '~/helpers/utility-functions/PushUnique.js';

/**
 * Adds each entry from the source array to the destination array in place, provided that the entry is not already in
 * the destination array.
 * @param {*[]} [destination] - The array that receives the entries; it is modified.
 * @param {*[]} [source] - The array whose entries are added.
 * @returns {void}
 */
export default function appendUnique(destination = [], source = []) {
   for (const entry of source) {
      pushUnique(destination, entry);
   }
}
