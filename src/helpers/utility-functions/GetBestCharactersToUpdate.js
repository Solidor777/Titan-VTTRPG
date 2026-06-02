import getTargetedCharacters from '~/helpers/utility-functions/GetTargetedCharacters.js';
import getControlledCharacters from '~/helpers/utility-functions/GetControlledCharacters.js';
import getFocusedCharacterSheetActor from '~/helpers/utility-functions/GetFocusedCharacterSheetActor.js';

/**
 * Gets the best Character Actors for the current user to perform updates on (combat damage, healing,
 * effect application). The primary order is unchanged from prior behavior; additional fallbacks are
 * appended where there previously were none.
 * GM: targeted characters (which themselves fall back to controlled tokens) -> focused sheet actor.
 * Player: controlled characters -> assigned character -> focused sheet actor.
 * @returns {TitanActor[]} The de-duplicated best Character Actors for the current user to update.
 */
export default function getBestCharactersToUpdate() {
   /** @type {TitanActor[]} The candidate actors collected from the active targeting rung. */
   let retVal = [];

   // If the user is a GM, prefer targeted characters (getTargetedCharacters already falls back to
   // controlled tokens for GMs when nothing is targeted).
   if (game.user.isGM) {
      retVal = getTargetedCharacters();
   }

   // Otherwise, for players, prefer controlled characters, then the assigned character.
   else {
      retVal = getControlledCharacters();
      if (retVal.length < 1) {
         /** @type {TitanActor | undefined} The user's assigned Character Actor, if any. */
         const userCharacter = game.user.character;
         if (userCharacter?.system.isCharacter) {
            retVal.push(userCharacter);
         }
      }
   }

   // Final fallback for both roles: the focused Character sheet, if any.
   if (retVal.length < 1) {
      /** @type {TitanActor | null} The focused sheet's Character Actor, if any. */
      const focused = getFocusedCharacterSheetActor();
      if (focused) {
         retVal.push(focused);
      }
   }

   // De-duplicate by id to guard against a token and its Actor resolving to the same Actor twice.
   /** @type {Map<string, TitanActor>} Unique actors keyed by id. */
   const unique = new Map();
   for (const target of retVal) {
      unique.set(target.id, target);
   }

   return Array.from(unique.values());
}
