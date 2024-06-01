import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Extends the base Item class to implement additional system-specific logic.
 * @param {object} data - The initial data object provided to the document creation request.
 * @param {object} options - Additional options which modify the creation request.
 * @param {documents.BaseUser} user - The User requesting the document creation.
 * @augments {Item}
 */
export default class TitanItem extends Item {

   /**
    * Returns whether the item is marked for deletion.
    * @returns {boolean} Whether the item is marked for deletion.
    */
   get isMarkedForDeletion() {
      return (this.flags?.titan?.isMarkedForDeletion === true);
   }

   /**
    * Performs initialization logic before document creation.
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {documents.BaseUser} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be cancelled.
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
    * Performs initialization logic after document creation.
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {documents.BaseUser} user - The User requesting the document creation.
    * @private
    */
   _onCreate(data, options, user) {
      super._onCreate(data, options, user);

      // Perform data model type specific updates
      if (typeof this.system.onPreCreate === 'function') {
         this.system.onPreCreate(data);
      }
   }

   /**
    * Apply transformations of derivations to the values of the source data object.
    * Compute data fields whose values are not stored to the database.
    */
   prepareDerivedData() {
      // Create type component if necessary
      if (!this.system) {
         this._initializeTypeComponent();
      }

      // Prepare type specific data
      if (this.system) {
         this.system.prepareDerivedData();
      }
   }

   /**
    * Creates a Chat Message containing this item's data and sends it to chat.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      // Create the context object
      const messageData = this.getRollData();

      // Create and post the message
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               user: game.user.id,
               speaker: this.parent?.getSpeaker() ?? ChatMessage.getSpeaker(),
               type: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.notification,
               flags: {
                  titan: messageData,
               },
               classes: ['titan'],
            },
            game.settings.get('core', 'rollMode'),
         ),
      );
   }

   /**
    * Prepares an object containing the data relevant to performing checks.
    * @returns {object} Object containing the relevant data.
    */
   getRollData() {
      return this.system.getRollData();
   }

   /**
    * Adds a new Check to this item.
    * @returns {Promise<void>}
    */
   async addCheck() {
      if (this.isOwner) {
         // Update document
         this.system.check.push(createItemCheckTemplate());
         await this.update({
            system: {
               check: this.system.check,
            }
         });

         // Update Sheet
         const sheet = this._sheet;
         if (sheet) {
            sheet.addCheck();
         }
      }
   }

   /**
    * Removes a Check from this item.
    * @param {number} idx - The Idx of the Check in this item's Checks array.
    * @returns {Promise<void>}
    */
   async removeCheck(idx) {
      if (this.isOwner) {
         // Update sheet
         const sheet = this._sheet;
         if (sheet) {
            sheet.removeCheck(idx);
         }

         // Update document
         this.system.check.splice(idx, 1);
         await this.update({
            system: {
               check: this.system.check,
            }
         });
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to this item.
    */
   addCustomTrait() {
      if (this.isOwner) {
         const dialog = new AddCustomTraitDialog(this);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an existing Custom Trait belonging to this item.
    * @param {number} traitIdx - The Idx of the Custom Trait in this item's Custom Traits array.
    */
   editCustomTrait(traitIdx) {
      if (this.isOwner) {
         const dialog = new EditCustomTraitDialog(this, traitIdx);
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from this item.
    * @param {number} traitIdx - The Idx of the Custom Trait in this item's Custom Traits array.
    */
   async deleteCustomTrait(traitIdx) {
      if (this.isOwner) {
         this.system.customTrait.splice(traitIdx, 1);
         await this.update({
            system: {
               customTrait: this.system.customTrait,
            },
         });
      }
   }

   /**
    * Marks the item as being deleted before actually deleting the item
    * so that asynchronous update operations will not apply.
    * @returns {Promise<void>}
    */
   async safeDelete() {
      if (this.isOwner && !this.isMarkedForDeletion) {
         await this.update({
            flags: {
               titan: {
                  isMarkedForDeletion: true,
               },
            },
         });

         await this.delete();
      }
   }
}
