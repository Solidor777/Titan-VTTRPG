/**
 * Returns an array of users for the document.
 * @param {Document} document - The document to retrieve owners for.
 * @returns {User[]} Array of users who own the document.
 */
export default function getOwners(document) {
   return game.users.filter((user) => document.testUserPermission(user, 'OWNER'));
}
