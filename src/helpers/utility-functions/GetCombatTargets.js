/**
 * Gets the combat targets for the current user.
 * First, searches for targetted Actors.
 * If no Actors are targetted and the user is a GM, selects controlled Actors as a fallback.
 * Only selects Actors that are valid for combat operations (i.e., are Characters).
 * @returns {TitanActor[]}   Array of actors targeted by the current user.
 */
export default function getCombatTargets() {
   // Get the user targets
   let targetedTokens = Array.from(game.user.targets);

   // If there are no user targets, and the current user is a gm, get the controlled tokens
   if (targetedTokens.length < 1 && game.user.isGM) {
      targetedTokens = Array.from(canvas.tokens.controlled);
   }

   // Filter for the targets that have Characters
   const combatTargets = [];
   for (const target of targetedTokens) {
      if (target.actor?.system.isCharacter) {
         combatTargets.push(target.actor);
      }
   }

   return combatTargets;
}
