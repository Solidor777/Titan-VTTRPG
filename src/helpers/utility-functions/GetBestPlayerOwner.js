import getPlayerOwners from '~/helpers/utility-functions/GetPlayerOwners.js';

/**
 * Gets the first player owner of the document, prioritizing active players.
 * @param   {Document}  document The document to find the owner for.
 * @returns {User|boolean}       The user first, best, non-gm user who owns the document,
 *                               or false if there are none.
 */
export default function getBestPlayerOwner(document) {

   // Get players who own the document
   const playerOwners = getPlayerOwners(document);
   if (playerOwners.length > 0) {

      // If there are multiple player owners
      if (playerOwners.length > 1) {

         // Get active player owners
         const activeOwners = playerOwners.filter((owner) => owner.active);
         if (activeOwners.length > 0) {

            // If there are multiple active player owners
            if (activeOwners.length > 1) {

               // Check if the current user is an owner
               if (document.isOwner) {
                  return game.user;
               }

               // Otherwise, check if one of the players has this document set to their character
               const mainCharacterPlayers = activeOwners.filter((owner) => owner.character._id === document._id);
               if (mainCharacterPlayers.length > 0) {
                  return mainCharacterPlayers[0];
               }
            }

            // Return first active player
            return activeOwners[0];
         }
      }

      // Otherwise, check if one of the players has this document set to their character
      const mainCharacterPlayers = activeOwners.filter((owner) => owner.character._id === document._id);
      if (mainCharacterPlayers.length > 0) {
         return mainCharacterPlayers[0];
      }

      // Return first player owner as a fallback
      return playerOwners[0];
   }

   // Found no player owners, so return false
   return false;
}
