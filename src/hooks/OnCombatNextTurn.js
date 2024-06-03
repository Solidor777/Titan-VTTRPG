/**
 * Called when combat advances from one turn to the next turn.
 * @param {Combatant} currentCombatant - The Combatant whose turn it currently is.
 * @param {Combatant} previousCombatant - The Combatant whose turn it previously was.
 * @param {Combatant} combat - The Combat that just advanced a turn.
 */
export default async function onCombatNextTurn(currentCombatant, previousCombatant, combat) {
   if (currentCombatant && previousCombatant && combat) {
      // Handle Initiative based effects
      const currentInitiative = currentCombatant.initiative;
      const previousInitiative = previousCombatant.initiative;

      // Ensure that the combatants have initiative set
      if (currentInitiative === null || previousInitiative === null) {
         game.titan.warn(
            'Current or Previous combatant had an Initiative of null. Initiative based effects will not function.',
            false,
            currentCombatant,
            previousCombatant,
         );
      }
      else {
         // Calculate whether this is a new round
         const isNewRound = currentInitiative > previousInitiative;

         // For each character combatant
         for (const combatant of combat.getCharacterCombatants()) {

            // Update initiative based effects on the character
            const character = combatant?.actor.isCharacter;
            if (character) {
               await character.system.onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound);
            }
         }
      }

      // Perform end of turn updates for the previous character
      const previousCharacter = previousCombatant.actor;
      if (previousCharacter && previousCharacter.system.isCharacter) {
         await previousCharacter.system.onTurnEnd();
      }

      // Start of turn operations for current combatant
      const currentCharacter = currentCombatant?.actor;
      if (currentCharacter && previousCharacter.system.isCharacter) {
         await currentCharacter.system.onTurnStart();
      }
   }
}
