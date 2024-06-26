import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * Extends the base Actor class to implement additional system-specific logic.
 * @augments {Actor}
 * @param {object}               data     The initial data object provided to the document creation request.
 * @param {object}               options  Additional options which modify the creation request.
 * @param {documents.BaseUser}   user     The User requesting the document creation.
 */
export default class TitanActor extends Actor {

   /**
    * Performs initialization logic before document creation.
    * @param {object}               data     The initial data object provided to the document creation request.
    * @param {object}               options  Additional options which modify the creation request.
    * @param {documents.BaseUser}   user     The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be cancelled
    * @private
    */
   async _preCreate(data, options, user) {
      const retVal = await super._preCreate(data, options, user);
      if (retVal !== false) {

         // Initialize the document's uuid
         const uuid = this.flags?.titan?.uuid;
         if (!uuid) {
            const initialData = {
               flags: {
                  titan: {
                     uuid: generateUUID(),
                  },
               },
            };

            this.updateSource(initialData);
         }

         // Update initial data if provided by the data model
         if (retVal !== false && typeof this.system.onPreCreate === 'function') {
            this.system.onPreCreate(data);
         }
      }

      return retVal;
   }


   /**
    * @typedef {object} ActorRollData  An object containing the roll data for an Actor document.
    * @property {object}   system   The system data for the document.
    * @property {string}   name     The name of the document.
    * @property {string}   type     The type of the document.
    * @property {string}   img      The image used by the document.
    */

   /**
    * Prepares an object containing the data relevant to performing checks.
    * @returns {ActorRollData} Object containing the relevant data.
    */
   getRollData() {
      return {
         name: this.name,
         img: this.img,
         type: this.type,
         system: foundry.utils.deepClone(this.system),
      };
   }

   /**
    * @typedef {object} Speaker  An object containing data on a Chat Message's speaker.
    * @property {Scene}   scene  The Scene is which the speaker resides.
    * @property {Actor}   actor  Actor that is speaking.
    * @property {string}  alias  The name of the speaker to display.
    * @property {string}  token  The Token id of the speaker.
    */

   /**
    * A helper to get a speaker from this actor.
    * @returns {Speaker}   The identified speaker data
    */
   getSpeaker() {
      return ChatMessage.getSpeaker({
         actor: this,
         token: this.token,
      });
   }

   /**
    * Gets an Initiative roll for this actor.
    * @returns {Promise<Roll>}   The Initiative roll.
    */
   async getInitiativeRoll() {
      // Calculate the initiative value
      const initiative = this.system.rating.initiative.value;

      // Get the initiative formula
      const initiativeFormula = getSetting('initiativeFormula');

      return new Roll(`${initiative}${initiativeFormula}`);
   }

   /**
    * Rolls initiative for this Character.
    * If the Character is in combat, the initiative tracker will be updated accordingly.
    * Otherwise, a chat card will be sent without update combat.
    */
   async requestInitiativeRoll() {
      if (this.isOwner) {

         // If this Character is a combatant, then roll initiative as per normal
         if (this.getCombatant()) {
            await this.rollInitiative({ rerollInitiative: true });

            return;
         }

         // Get and evaluate the roll
         const roll = await this.getInitiativeRoll();
         if (roll) {

            // Get the message data
            const messageData = {
               speaker: this.getSpeaker(),
               flavor: game.i18n.format('COMBAT.RollsInitiative', { name: this.name }),
               flags: { 'core.initiativeRoll': true },
            };

            // Create a chat message from the roll and send it to chat
            const chatData = await roll.toMessage(messageData, { create: false });
            chatData.rollMode = game.settings.get('core', 'rollMode');

            await ChatMessage.create(chatData);
         }
      }
   }

   /**
    * Gets this actor's Combatant in the active combat (if any).
    * Otherwise, returns undefined.
    * @returns {Combatant} This Character's combatant in combat.
    */
   getCombatant() {
      return game.combat?.getCombatantByActor(this.id);
   }
}
