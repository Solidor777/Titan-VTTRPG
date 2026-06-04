import AddCustomTraitDialog from '~/document/types/item/dialog/AddCustomTraitDialog.js';
import EditCustomTraitDialog from '~/document/types/item/dialog/EditCustomTraitDialog.js';
import createItemCheckTemplate from '~/check/types/item-check/ItemCheckTemplate.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import assert from '~/helpers/utility-functions/Assert.js';

/**
 * Extends the base Item class to implement additional system-specific logic for Titan.
 * @property {TitanItemSheet} sheet - The Sheet that represents this Item.
 * @extends {Item}
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
      // Prepare type-specific data.
      if (this.system) {
         this.system.prepareDerivedData();
      }
   }

   /**
    * Builds the chat message payload for this item as a first-class chat-message subtype. Produces a
    * historical snapshot of this item's PREPARED system data (derived values included, mirroring what
    * the card displays today) structured under `system`, so the resulting message's
    * `system.X` paths match the item's `system.X` paths (path parity for component reuse). The item's
    * `name` and `img` are folded into `system` as label metadata since they are not part of
    * `item.system`; the document-level `id` and `type` are dropped (the chat document carries its own
    * `id`, and `type` is returned at the top level to select the chat-message subtype). Pure and
    * side-effect free so it is unit-testable without `ChatMessage.create`.
    * @returns {object} The chat message data `{ type, system }`, where `type` selects the
    * chat-message subtype and `system` is the prepared item-system snapshot plus `name` and `img`.
    */
   buildChatMessageData() {
      // The prepared roll data: the document-level id/name/img/type plus the prepared system fields.
      const rollData = this.system.getRollData();

      // Separate the document-level keys from the prepared system fields.
      const { id, type, name, img, ...systemData } = rollData;

      return {
         type: this.type,
         system: {
            ...systemData,
            name,
            img,
         },
      };
   }

   /**
    * Creates a Chat Message containing this item's data and sends it to chat as a first-class
    * chat-message subtype (`type` + `system`), preserving the speaker, style, sound, and roll mode.
    * @returns {Promise<ChatMessage>} The newly created Chat Message.
    */
   async sendToChat() {
      // Build the typed chat-message payload (type + prepared system snapshot).
      const messageData = this.buildChatMessageData();

      // Create and post the message.
      return ChatMessage.create(
         ChatMessage.applyRollMode(
            {
               ...messageData,
               user: game.user.id,
               speaker: this.parent?.getSpeaker() ?? ChatMessage.getSpeaker(),
               style: CONST.CHAT_MESSAGE_STYLES.OTHER,
               sound: CONFIG.sounds.notification,
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

         // Initialize the document's UUID.
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

         // Update initial data if provided by the data model.
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
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         this.system.check.push(createItemCheckTemplate());
         await this.update({
            system: {
               check: structuredClone(this.system.check),
            }
         });

         // Notify the sheet of the added check.
         if (this.sheet) {
            this.sheet.postAddCheck();
         }
      }
   }

   /**
    * Removes a Check from this item.
    * @param {number} idx - The index of the Check in this item's Checks array.
    * @returns {Promise<void>}
    */
   async deleteCheck(idx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         // Notify the sheet before deletion.
         if (this.sheet) {
            this.sheet.preDeleteCheck(idx);
         }

         this.system.check.splice(idx, 1);
         await this.update({
            system: {
               check: structuredClone(this.system.check),
            }
         });
      }
   }

   /**
    * Creates a dialog for adding a new Custom Trait to this item.
    * @returns {void}
    */
   addCustomTrait() {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         const dialog = new AddCustomTraitDialog(this);
         dialog.render(true);
      }
   }

   /**
    * Creates a dialog for editing an existing Custom Trait belonging to this item.
    * @param {number} traitIdx - The index of the Custom Trait in this item's Custom Traits array.
    * @returns {void}
    */
   editCustomTrait(traitIdx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         const dialog = new EditCustomTraitDialog(
            this,
            traitIdx,
         );
         dialog.render(true);
      }
   }

   /**
    * Removes a Custom Trait from this item.
    * @param {number} traitIdx - The index of the Custom Trait in this item's Custom Traits array.
    * @returns {Promise<void>}
    */
   async deleteCustomTrait(traitIdx) {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      )) {
         /** @type {object[]} A fresh array with the targeted Custom Trait removed. */
         const next = this.system.customTrait.filter((trait, idx) => idx !== traitIdx);

         await this.update({
            system: {
               customTrait: next,
            },
         });
      }
   }

   /**
    * Marks the item as being deleted before actually deleting the item
    * so that asynchronous update operations will not apply.
    * @returns {Promise<void|boolean>} Resolves once the item is deleted, or false if the deletion could not proceed.
    */
   async safeDelete() {
      if (assert(
         this.isOwner,
         'Cannot modify document %s if not owner.',
         this.name,
      ) && assert(
         !this.isMarkedForDeletion,
         'Item already marked for deletion.',
         this.name,
      )) {
         await this.update({
            flags: {
               titan: {
                  isMarkedForDeletion: true,
               },
            },
         });

         return this.delete();
      }

      return false;
   }
}
