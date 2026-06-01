/**
 * A class for extending a Combat Encounter with system-specific logic.
 * @extends {Combat}
 */
export default class TitanCombat extends Combat {
   /**
    * Gets the Initiative of the current combat turn.
    * @returns {number} The Initiative of the current combat turn.
    */
   get initiative() {
      return this.turn !== null ? this.turns[this.turn].initiative : null;
   }

   /**
    * Advances to the next turn, triggering the combatNextTurn hook via socket for all clients.
    * Emits combatant and combat IDs rather than live document instances so that the JSON-serialized
    * socket payload delivers stable primitive values — handlers re-resolve to live documents on receipt.
    * @override
    * @returns {Promise<Combat>} The updated Combat document.
    */
   async nextTurn() {
      let previousCombatant = this.combatant;
      const retVal = await super.nextTurn();
      if (this.turns.length > 1) {
         const currentCombatant = this.combatant;
         game.titan.socketManager.triggerSocketHook('combatNextTurn', currentCombatant?.id, previousCombatant?.id, this.id);
      }
      return retVal;
   }

   /**
    * Retreats to the previous turn, triggering the combatPreviousTurn hook via socket for all clients.
    * Emits combatant and combat IDs rather than live document instances so that the JSON-serialized
    * socket payload delivers stable primitive values — handlers re-resolve to live documents on receipt.
    * @override
    * @returns {Promise<Combat>} The updated Combat document.
    */
   async previousTurn() {
      let displacedCombatant = this.combatant;
      const retVal = await super.previousTurn();
      if (this.turns.length > 1) {
         const restoredCombatant = this.combatant;
         game.titan.socketManager.triggerSocketHook('combatPreviousTurn', restoredCombatant?.id, displacedCombatant?.id, this.id);
      }
      return retVal;
   }

   /**
    * Gets all the Character combatants owned by this combat.
    * @returns {Combatant[]} All Character combatants owned by this combat.
    */
   getCharacterCombatants() {
      return this.combatants?.filter((combatant) => combatant.actor?.system.isCharacter);
   }
}
