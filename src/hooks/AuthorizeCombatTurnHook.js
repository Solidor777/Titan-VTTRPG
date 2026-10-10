import retryResolve from '~/helpers/utility-functions/RetryResolve.js';

/**
 * Decides whether a remote client may fire the `combatNextTurn` or `combatPreviousTurn` hook on this client. Core lets
 * a GM and the owner of the combatant whose turn ends move the turn, so only they may mirror it. The combat may not
 * have replicated yet (the socket and Foundry's own replication are separate paths), so it is re-resolved with the
 * bounded retry the handlers use.
 * @param {string} senderId - The ID of the user who sent the hook, from the transport.
 * @param {string} currentCombatantId - The ID of the combatant whose turn it now is.
 * @param {string} endingCombatantId - The ID of the combatant whose turn ended.
 * @param {string} combatId - The ID of the combat.
 * @returns {Promise<boolean>} Whether the sender may move the turn.
 */
export default async function authorizeCombatTurnHook(senderId, currentCombatantId, endingCombatantId, combatId) {
   /** @type {User|undefined} The sender. */
   const sender = game.users.get(senderId);
   if (!sender) {
      return false;
   }
   if (sender.isGM) {
      return true;
   }

   /** @type {Actor|null} The actor of the combatant whose turn ended. */
   const actor = await retryResolve(() => game.combats.get(combatId)?.combatants.get(endingCombatantId)?.actor);
   return !!actor?.testUserPermission(sender, 'OWNER');
}
