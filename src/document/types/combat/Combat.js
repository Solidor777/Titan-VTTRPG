/**
 * A class for extending a Combat Encounter with system-specific logic.
 * @augments Combat
 */
export default class TitanCombat extends Combat {
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
    * @returns {Array<Combatant>} All Character combatants owned by this combat.
    */
   getCharacterCombatants() {
      return this.combatants?.filter((combatant) => combatant.actor?.system.isCharacter);
   }
}
