import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import warn from '~/helpers/utility-functions/Warn.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import ActorSheetToggleLinkedTokenButton from '~/document/types/actor/sheet/ActorSheetToggleLinkedTokenButton.svelte';
import ActorSheetUnlinkTokenButton from '~/document/types/actor/sheet/ActorSheetUnlinkTokenButton.svelte';
import ActorSheetUnlinkedTokenButton from '~/document/types/actor/sheet/ActorSheetUnlinkedTokenButton.svelte';
import ActorSheetEditTokenButton from '~/document/types/actor/sheet/ActorSheetEditTokenButton.svelte';
import ActorSheetImportActorButton from '~/document/types/actor/sheet/ActorSheetImportActorButton.svelte';

/**
 * A Document Sheet class with functionality shared by all Actors.
 * @extends {TitanDocumentSheet}
 */
export default class TitanActorSheet extends TitanDocumentSheet {
   /**
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Calculate whether this sheet's Actor is a token or a proxy
      const actor = sheetDocument.isToken ? sheetDocument.parent.actor : sheetDocument;
      options.token ??= null;

      // Add sheet classes
      const classes = ['titan-actor-sheet'];
      options.classes = options.classes
         ? mergeArrays(classes, options.classes)
         : classes;

      super(actor, options);

      /** @type {TitanActor} The Actor this sheet belongs to. */
      this.actor = actor;
   }

   /**
    * Default Application options.
    * @override
    * @returns {object} Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      let parentOptions = super.defaultOptions;
      return foundry.utils.mergeObject(parentOptions, {
         baseApplication: 'ActorSheet',
         width: 750,
      });
   }

   /**
    * Get the header buttons for the sheet.
    * @override
    * @returns {object[]} Array of button configuration objects.
    * @protected
    */
   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // If the active user can edit this sheet's Actor's tokens...
      const canEditToken = game.user.isGM || (this.actor.isOwner && game.user.can('TOKEN_CONFIGURE'));
      if (canEditToken) {
         const token = this.token;

         // Configure token button
         buttons.unshift({
            svelte: {
               class: ActorSheetEditTokenButton,
            }
         });

         // Toggle token link for actors still in the directory
         if (token === null) {
            buttons.unshift({
               svelte: {
                  class: ActorSheetToggleLinkedTokenButton,
               },
            });
         }

         // For actors not in the directory (on the canvas)
         else {
            // Unlink button for linked tokens
            if (token.actorLink === true) {
               buttons.unshift({
                  svelte: {
                     class: ActorSheetUnlinkTokenButton,
                  },
               });
            }

            // Warning icon for unlinked tokens
            else {
               buttons.unshift({
                  svelte: {
                     class: ActorSheetUnlinkedTokenButton,
                  }
               });
            }
         }
      }

      // Import button for actors that can be imported
      if (game.user.isGM && this.actor.pack) {
         buttons.unshift({
            svelte: {
               class: ActorSheetImportActorButton,
            }
         });
      }
      return buttons;
   }

   /**
    * Closes the sheet.
    * @override
    * @param {object} [options={}] - Close options.
    * @returns {Promise<void>}
    */
   async close(options = {}) {
      // Clear the token reference so it is not held in memory after the sheet
      // closes.
      this.options.token = null;
      return super.close(options);
   }

   /**
    * If this sheet's Actor Sheet represents a synthetic Token actor, gets a
    * reference to the active Token.
    * @type {TokenDocument | null}
    */
   get token() {
      return this.options?.token || this.actor.token || null;
   }

   /**
    * Handles the dropping of ActiveEffect data onto an Actor Sheet.
    * @param {DragEvent} event - The concluding DragEvent which contains drop
    *    data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<ActiveEffect[] | boolean>} The created ActiveEffect
    *    instances, or false if the effect couldn't be created.
    * @protected
    */
   async _onDropActiveEffect(event, data) {
      // Create an effect from the drag data.
      const activeEffect = await ActiveEffect.implementation.fromDropData(data);

      // Don't create new effect if this sheet's Actor is the origin.
      if (!activeEffect || this.actor.uuid === activeEffect.parent?.uuid) {
         return false;
      }

      // Add the effect to the actor.
      return this.actor.addActiveEffect(activeEffect.toObject());
   }

   /**
    * Handle dropping of an item reference or item data onto an Actor Sheet.
    * @param {DragEvent} event - The concluding DragEvent which contains drop
    *    data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[] | boolean>} The created or updated Item instances,
    *    or false if the drop was not permitted.
    * @protected
    */
   async _onDropItem(event, data) {
      // Create an item from the drag data
      /** @type {TitanItem} */
      const item = await Item.implementation.fromDropData(data);
      if (!item) {
         return false;
      }

      // Make the item data into an object
      const itemData = item.toObject();

      // If this item is from this sheet's Actor, sort the item rather than
      // creating a new one
      if (this.actor.uuid === item.parent?.uuid) {
         return this._onSortItem(event, itemData);
      }

      // Otherwise, create a new item
      return this.actor.addItem(itemData);
   }

   /**
    * Handle a drop event for an existing embedded Item to sort that Item
    * relative to its siblings.
    * @param {DragEvent} event - The concluding DragEvent which contains drop
    *    data.
    * @param {object} itemData - The item data requested for sorting.
    * @returns {Promise<TitanItem[] | boolean>} The updated item instances, or
    *    false if the data was invalid.
    * @private
    */
   async _onSortItem(event, itemData) {
      // Get the drag source and drop target
      const items = this.actor.items;
      const source = items.get(itemData.id);
      const dropTarget = event.target.closest('[data-item-id]');

      // If the drop target is valid
      if (dropTarget) {
         const target = items.get(dropTarget.dataset.itemId);

         // If the dropped item is the target
         if (source.id === target.id) {

            // Identify sibling items based on adjacent HTML elements
            const siblings = [];
            for (let itemElement of dropTarget.parentElement.children) {
               const siblingId = itemElement.dataset.itemId;
               if (siblingId && (siblingId !== source.id)) {
                  siblings.push(items.get(itemElement.dataset.itemId));
               }
            }

            // Perform the sort
            const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
            const updateData = sortUpdates.map((entry) => {
               const update = entry.update;
               update.id = entry.target.id;
               return update;
            });

            // Perform the update
            return /** @type Promise<TitanItem[]> */ this.actor.updateEmbeddedDocuments(
               'Item',
               updateData
            );
         }
      }

      return false;
   }

   /**
    * Handle dropping of a Folder on an Actor Sheet.
    * The core sheet currently supports dropping a Folder of Items to create all
    * items as owned items.
    * @param {DragEvent} event - The concluding DragEvent which contains drop
    *    data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[] | boolean>} The created Item instances, or false if
    *    the folder was invalid or not of type
    *    Item.
    * @protected
    */
   async _onDropFolder(event, data) {
      // Create folder from the drop data
      const folder = await Folder.implementation.fromDropData(data);
      if (folder && folder.type !== 'Item') {

         // Get the contents of the folder
         const droppedItemData = await Promise.all(folder.contents.map(async (item) => {
            if (!(item instanceof Item)) {
               item = await fromUuid(item.uuid);
            }
            return item.toObject();
         }));

         // Add the folder contents to the actor
         return this.actor.addItem(droppedItemData);
      }

      return false;
   }

   /**
    * Called after an Item is added to this Sheet's Actor.
    * @param {TitanItem} item - The Item that was just created.
    */
   postAddItem(item) {
   }

   /**
    * Called before an Item is removed from this Sheet's Actor.
    * @param {TitanItem} item - The Item being deleted.
    */
   preDeleteItem(item) {
   }

   /**
    * Called after an Item is removed from this Sheet's Actor.
    * @param {string} id - The ID of the item that was deleted.
    * @param {string} type - The Type of the item that was deleted.
    */
   postDeleteItem(id, type) {
   }

   /**
    * Processes data when dropped onto this sheet.
    * @override
    * @param {DragEvent} event - The concluding DragEvent which contains drop
    *    data.
    * @returns {Promise<Item[] | ActiveEffect[] | boolean>} The newly created
    *    embedded documents, or false if the drop was
    *    not allowed.
    * @protected
    */
   async _onDrop(event) {
      // Get the data from the drag event
      const data = TextEditor.getDragEventData(event);

      /**
       * A hook event that fires when some useful data is dropped onto an
       * ActorSheet.
       * @param {Actor} actor - The Actor that the data was dropped onto.
       * @param {ActorSheet} sheet - The ActorSheet application.
       * @param {object} data - The data that has been dropped onto the sheet.
       */
      const allowed = Hooks.call('dropActorSheetData', this.actor, this, data);
      if (allowed === false) {
         return false;
      }

      // Handle different data types
      switch (data.type) {
         case 'ActiveEffect': {
            return this._onDropActiveEffect(event, data);
         }
         case 'Item': {
            return this._onDropItem(event, data);
         }
         case 'Folder': {
            return this._onDropFolder(event, data);
         }
         default: {
            warn(`${this.actor.name} | Invalid type in _onDrop (${data.type}).`);
            break;
         }
      }

      return false;
   }
}
