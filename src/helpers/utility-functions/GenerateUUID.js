import ShortUniqueId from 'short-unique-id';

/**
 * Gets a random unique ID of a specified length.
 * @param {number} [idLength] - The length of the UUID to generate.
 * @returns {string} The generated UUID.
 */
export default function generateUUID(idLength = 16) {
   return new ShortUniqueId({ length: idLength }).rnd();
}
