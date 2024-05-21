import getCombatTargets from "~/helpers/utility-functions/GetCombatTargets.js";

/**
 * Gets the best targets for the current user to perform combat operations on.
 * If the user is a Player, selects controlled Actors.
 * If the user is a GM, selects combat targets.
 * @returns {TitanActor[]}   Array of actors targeted by the current user.
 */
export default function getBestUserTargets() {
   // If the user is a gm, return combat targets
   if (game.user.isGM) {
      return getCombatTargets();
   }

   // Otherwise, get controlled targets
   const targets = [];
   const controlledTokens = Array.from(canvas.tokens.controlled);

   // Filter for controlled characters
   for (const target of controlledTokens) {
      if (target.actor?.system.isCharacter) {
         targets.push(target.actor);
      }
   }

   // Use the user character as a fallback
   if (targets.length <= 0) {
      const userCharacter = game.user.character;
      if (userCharacter?.system.isCharacter) {
         return [userCharacter];
      }
   }

   return targets;
}
