/**
 * Returns an array of users for the document.
 * @param {Document} document - The Document this sheet is for.ocument to test.
 * @returns {User[]} Array of users who own the document.
 */
export default function getOwners(document) {
   return game.users.filter((user) => document.testUserPermission(user, 'OWNER'));
}
