import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * Extends the base Item class to implement additional system-specific logic for Titan.
 * @extends {BaseItem}
 * @property {TitanItemSheet} sheet - The Sheet that represents this Item.
 */
export default class TitanItem extends Item {

   /**
    * Returns whether the item is marked for deletion.
    * @type {boolean}
    */
   get isMarkedForDeletion() {
      return (this.flags?.titan?.isMarkedForDeletion === true);
   }

   /**
    * Apply transformations of derivations to the values of the source data object.
    * Compute data fields whose values are not stored to the database.
    * @override
    */
   prepareDerivedData() {
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
    * @override
    * @returns {object} Object containing the relevant data.
    */
   getRollData() {
      return this.system.getRollData();
   }

   /**
    * Performs initialization logic before document creation.
    * @override
    * @param {object} data - The initial data object provided to the document creation request.
    * @param {object} options - Additional options which modify the creation request.
    * @param {User} user - The User requesting the document creation.
    * @returns {Promise<boolean|void>} A return value of false indicates the creation operation should be cancelled.
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
    * Adds a new Check to this item.
    * @returns {Promise<void>}
    */
   async addCheck() {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         // Update document
         this.system.check.push(createItemCheckTemplate());
         await this.update({
            system: {
               check: this.system.check,
            }
         });

         // Broadcast delegates
         if (this.sheet) {
            this.sheet.postAddCheck();
         }
      }
   }

   /**
    * Removes a Check from this item.
    * @param {number} idx - The Idx of the Check in this item's Checks array.
    * @returns {Promise<void>}
    */
   async deleteCheck(idx) {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         // Update sheet
         if (this.sheet) {
            this.sheet.preDeleteCheck(idx);
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
    * @returns {void}
    */
   addCustomTrait() {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         const dialog = new AddCustomTraitDialog(this);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an existing Custom Trait belonging to this item.
    * @param {number} traitIdx - The Idx of the Custom Trait in this item's Custom Traits array.
    * @returns {void}
    */
   editCustomTrait(traitIdx) {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
         const dialog = new EditCustomTraitDialog(this, traitIdx);
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from this item.
    * @param {number} traitIdx - The Idx of the Custom Trait in this item's Custom Traits array.
    * @returns {Promise<void>}
    */
   async deleteCustomTrait(traitIdx) {
      if (game.titan.assert(this.isOwner, 'Cannot modify document %s if not owner.', this.name)) {
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
    * @returns {Promise<void|boolean>} Returns false if the deletion failed.
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

         return this.delete();
      }
      else {
         game.titan.warn(`Item ${this.name} is already marked for deletion.`);
         return false;
      }
   }
}
