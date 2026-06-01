import retryResolve from '~/helpers/utility-functions/RetryResolve.js';
import warn from '~/helpers/utility-functions/Warn.js';

/**
 * Called when combat retreats from the current turn to the previous turn.
 * @param {string} restoredCombatantId - The ID of the Combatant whose turn has been restored as current.
 * @param {string} displacedCombatantId - The ID of the Combatant whose turn was displaced.
 * @param {string} combatId - The ID of the Combat that just retreated a turn.
 */
export default async function onCombatPreviousTurn(restoredCombatantId, displacedCombatantId, combatId) {
   // The socket relay delivers IDs (live document instances do not survive serialization), and the
   // socket can beat Foundry's native combat replication on a congested client, so re-resolve to live
   // documents with a bounded retry before use.
   const context = await retryResolve(() => {
      // The live combat and its two relevant combatants, re-resolved from the relayed IDs.
      const combat = game.combats.get(combatId);
      const restoredCombatant = combat?.combatants.get(restoredCombatantId);
      const displacedCombatant = combat?.combatants.get(displacedCombatantId);
      return combat && restoredCombatant && displacedCombatant
         ? { combat, restoredCombatant, displacedCombatant }
         : null;
   });

   // If re-resolution failed after retrying, the relayed update never replicated on this client; warn so
   // the dropped apply is diagnosable rather than silent, then bail.
   if (!context) {
      warn(
         'Combat previous-turn socket could not re-resolve the combat or its combatants after retrying; '
         + 'turn effects were not reverted on this client.',
         combatId,
         restoredCombatantId,
         displacedCombatantId,
      );
      return;
   }

   // The re-resolved live documents.
   const { combat, restoredCombatant, displacedCombatant } = context;

   // Handle Initiative based effects.
   const restoredInitiative = restoredCombatant.initiative;
   const displacedInitiative = displacedCombatant.initiative;

   // Ensure that the combatants have initiative set.
   if (restoredInitiative === null || displacedInitiative === null) {
      warn(
         'Restored or Displaced combatant had an Initiative of null. Initiative based effects will not function.',
         restoredCombatant,
         displacedCombatant,
      );
   }
   else {
      // Compute the forward-step parameters: the step that is being reversed went from restoredInitiative
      // to displacedInitiative, so pass those as currentInitiative and previousInitiative respectively.
      // This ensures the same filter selects the same effects that were decremented in the forward step.
      const forwardIsNewRound = displacedInitiative > restoredInitiative;

      // For each character combatant, revert initiative based effects.
      for (const combatant of combat.getCharacterCombatants()) {
         const actor = combatant?.actor;
         if (actor) {
            await actor.system.onInitiativeReverted(displacedInitiative, restoredInitiative, forwardIsNewRound);
         }
      }
   }

   // Revert end-of-turn effect duration changes for the restored combatant.
   const restoredCharacter = restoredCombatant.actor;
   if (restoredCharacter && restoredCharacter.system.isCharacter) {
      await restoredCharacter.system.onTurnEndReverted();
   }

   // Revert start-of-turn effect duration changes for the displaced combatant.
   const displacedCharacter = displacedCombatant?.actor;
   if (displacedCharacter && displacedCharacter.system.isCharacter) {
      await displacedCharacter.system.onTurnStartReverted();
   }
}
