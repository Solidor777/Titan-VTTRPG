import getOwners from '~/helpers/utility-functions/GetOwners.js';

/**
 * Returns an array of users who own the document, and are not gms.
 * @param {Document} document The document to test.
 * @returns {User[]}          Array of users who own this document and are not gms.
 */
export default function getPlayerOwners(document) {
   return getOwners(document).filter((user) => !user.isGM);
}
