import getPlayerOwners from '~/helpers/utility-functions/GetPlayerOwners.js';

/**
 * Helper function for determining if the current user is the first best active owner of a document, prioritizing gms,
 * followed by the first owning player
 * This is used to ensure certain functions only fire once, such as when an actor's turn starts.
 * @param {Document} document The document to est.
 * @returns {boolean}         True if the current user is the first active owner of a document.
 *                            Otherwise, returns false.
 */
export default function isCurrentUserBestOwner(document) {
   // Check if a gm is currently active.
   const activeGMUsers = game.users.filter((user) => user.active && user.isGM);

   // If there are gms active, return true if this user is the first one
   if (activeGMUsers.length > 0) {
      return game.user.id === activeGMUsers[0].id;
   }

   // Otherwise check if there is an active owner.
   // If so, return if the current user is the first active owner.
   const activeOwners = getPlayerOwners(document).filter((user) => user.active);
   return activeOwners.length > 0 && game.user.id === activeOwners[0].id;
}
