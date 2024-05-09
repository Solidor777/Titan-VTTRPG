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

               // Check if one is the current user
               const userPlayerOwner =
                  activeOwners.filter((activeOwner) => activeOwner.id === game.user.id);

               // If so, return that user
               if (userPlayerOwner) {
                  return userPlayerOwner[0];
               }
            }

            // Return first active player
            return activeOwners[0];
         }
      }
      // Return first player
      return playerOwners[0];
   }

   // Found no player owners, so return false
   return false;
}
