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
    * Advances to the next turn, triggering the combatNextTurn hook via socket
    * for all clients.
    * @returns {Promise<Combat>} The updated Combat document.
    * @override
    */
   async nextTurn() {
      let previousCombatant = this.combatant;
      const retVal = await super.nextTurn();
      if (this.turns.length > 1) {
         const currentCombatant = this.combatant;
         game.titan.socketManager.triggerSocketHook('combatNextTurn', currentCombatant, previousCombatant, this);
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
