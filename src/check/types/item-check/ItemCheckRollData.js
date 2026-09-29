/**
 * Creates plain Item Check roll data from an item-like source (e.g. a chat card's live system data model): a deep
 * copy of the source's whole plain data, so the check never holds the source by reference and every field an Item
 * Check reads is present.
 * @param {object} source - The item-like source; a data model is read through its `toObject()`.
 * @returns {object} The plain roll data.
 */
export default function createItemCheckRollData(source) {
   return structuredClone(typeof source.toObject === 'function' ? source.toObject() : source);
}
