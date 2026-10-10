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
    * Updates the combat. Every route that moves the turn (Begin Combat, Next Turn, Previous Turn, Next Round and
    * Previous Round) ends in one update of `round` and `turn`, so this is the single place that relays the move to every
    * client. Core marks the direction of a move in `options.direction`; Begin Combat is the update from round 0 to
    * round 1 and carries none. The relay emits combatant and combat IDs rather than live document instances so that the
    * JSON-serialized socket payload delivers stable primitive values; the handlers re-resolve to live documents.
    * @override
    * @param {object} [data] - The changes to apply.
    * @param {object} [options] - The update operation; `direction` is 1 forward and -1 backward for a turn move.
    * @returns {Promise<Combat>} The updated Combat document.
    */
   async update(data = {}, options = {}) {
      /** @type {number} The round before the update. */
      const previousRound = this.round;
      /** @type {number|null} The turn before the update. */
      const previousTurn = this.turn;
      /** @type {Combatant|null} The combatant whose turn it was before the update. */
      const previousCombatant = this.combatant;

      const retVal = await super.update(data, options);

      /** @type {boolean} Whether the update moved the round or the turn. */
      const moved = retVal && (this.round !== previousRound || this.turn !== previousTurn);
      if (moved) {
         /** @type {boolean} Whether the update began the combat. */
         const began = previousRound === 0 && this.round === 1;

         // A solo combatant has no other turn to hand over to, so only the beginning of the combat is relayed.
         if (began || (options.direction && this.turns.length > 1)) {
            /** @type {string} The hook that carries the move: backward moves revert the forward hook's work. */
            const hook = options.direction < 0 ? 'combatPreviousTurn' : 'combatNextTurn';
            game.titan.socketManager.triggerSocketHook(hook, this.combatant?.id, previousCombatant?.id, this.id);
         }
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
