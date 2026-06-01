import retryResolve from '~/helpers/utility-functions/RetryResolve.js';
import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Called when combat advances from one turn to the next turn.
 * @param {string} currentCombatantId - The ID of the Combatant whose turn it currently is.
 * @param {string} previousCombatantId - The ID of the Combatant whose turn it previously was.
 * @param {string} combatId - The ID of the Combat that just advanced a turn.
 */
export default async function onCombatNextTurn(currentCombatantId, previousCombatantId, combatId) {
   // The socket relay delivers IDs (live document instances do not survive serialization), and the
   // socket can beat Foundry's native combat replication on a congested client, so re-resolve to live
   // documents with a bounded retry before use.
   const context = await retryResolve(() => {
      // The live combat and its two relevant combatants, re-resolved from the relayed IDs.
      const combat = game.combats.get(combatId);
      const currentCombatant = combat?.combatants.get(currentCombatantId);
      const previousCombatant = combat?.combatants.get(previousCombatantId);
      return combat && currentCombatant && previousCombatant
         ? { combat, currentCombatant, previousCombatant }
         : null;
   });

   // If re-resolution failed after retrying, the relayed update never replicated on this client; warn so
   // the dropped apply is diagnosable rather than silent, then bail.
   if (!context) {
      warn(
         'Combat next-turn socket could not re-resolve the combat or its combatants after retrying; '
         + 'turn effects were not applied on this client.',
         combatId,
         currentCombatantId,
         previousCombatantId,
      );
      return;
   }

   // The re-resolved live documents.
   const { combat, currentCombatant, previousCombatant } = context;

   // Handle Initiative based effects.
   const currentInitiative = currentCombatant.initiative;
   const previousInitiative = previousCombatant.initiative;

   // Ensure that the combatants have initiative set.
   if (currentInitiative === null || previousInitiative === null) {
      warn(
         'Current or Previous combatant had an Initiative of null. Initiative based effects will not function.',
         currentCombatant,
         previousCombatant,
      );
   }
   else {
      // Calculate whether this is a new round.
      const isNewRound = currentInitiative > previousInitiative;

      // For each character combatant.
      for (const combatant of combat.getCharacterCombatants()) {

         // Update initiative based effects on the character.
         const actor = combatant?.actor;
         if (actor) {
            await actor.system.onInitiativeAdvanced(currentInitiative, previousInitiative, isNewRound);
         }
      }
   }

   // Perform end of turn updates for the previous character.
   const previousCharacter = previousCombatant.actor;
   if (previousCharacter && previousCharacter.system.isCharacter) {
      await previousCharacter.system.onTurnEnd();
   }

   // Start of turn operations for current combatant.
   const currentCharacter = currentCombatant?.actor;
   if (currentCharacter && currentCharacter.system.isCharacter) {
      await currentCharacter.system.onTurnStart();
   }
}
