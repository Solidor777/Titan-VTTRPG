import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Deep-clones a plain element bag (rules element, check, attack, or custom aspect) and stamps a
 * fresh uuid, so a copied element is independent of its source and keeps the per-element identity
 * the sheet lists key on.
 * @param {object} element - The element to copy. Must be structured-clone-safe (plain data).
 * @returns {object} The independent copy with a new uuid.
 */
export default function cloneElementWithNewUuid(element) {
   return {
      ...structuredClone(element),
      uuid: generateUUID(),
   };
}
