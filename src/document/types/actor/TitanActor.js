import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import getSetting from '~/helpers/utility-functions/GetSetting.js';

/**
 * @typedef {object} SpeakerData An object containing data on a Chat Message's speaker.
 * @property {Scene} [scene] The Scene in which the speaker resides.
 * @property {string} [actor] The ID of the speaker's actor.
 * @property {string} [alias] The name of the speaker to display.
 * @property {string} [token] The ID of the speaker's Token.
 */

/**
 * Extends the base Actor class to implement additional system-specific logic for Titan.
 * @extends {Actor}
 */
export default class TitanActor extends Actor {

   /**
    * Performs initialization logic before document creation.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be canceled.
    * @protected
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
    * Prepares an object containing the data relevant to performing checks.
    * @override
    * @returns {object} Object containing the relevant data.
    */
   getRollData() {
      return this.system.getRollData();
   }

   /**
    * A helper to get a speaker from this actor.
    * @returns {SpeakerData} The identified speaker data.
    */
   getSpeaker() {
      return ChatMessage.getSpeaker({
         actor: this,
         token: this.token,
      });
   }

   /**
    * Gets an Initiative roll for this actor.
    * @returns {Promise<Roll>} The Initiative roll for this actor.
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
    * @returns {Promise<void>}
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
    * @returns {Combatant|undefined} This Character's combatant in combat.
    */
   getCombatant() {
      return game.combat?.getCombatantByActor(this.id);
   }

   /**
    * Gets all items of the provided Type.
    * @param {string} type - The Type of Item to search for.
    * @returns {TitanItem[]} - List of all Items of the provided type owned by this Actor.
    */
   getItemsOfType(type) {
      return this.items.filter(item => item.type === type);
   }

   /**
    * Gets all items of the provided Types.
    * @param {string[]} types - The Types of Item to search for.
    * @returns {TitanItem[]} - List of all Items of the provided type owned by this Actor.
    */
   getItemsOfTypes(types) {
      return this.items.filter(item => types.includes(item.type));
   }
}
