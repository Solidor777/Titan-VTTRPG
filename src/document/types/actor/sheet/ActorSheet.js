import TitanDocumentSheet from '~/document/sheet/DocumentSheet';
import localize from '~/helpers/utility-functions/Localize.js';
import {IMPORT_ICON, LINKED_ICON, UNLINKED_ICON, USER_ICON} from '~/system/Icons.js';

export default class TitanActorSheet extends TitanDocumentSheet {
   constructor(document, options = {}) {
      const actor = document.isToken ? document.parent.actor : document;
      super(actor, options);
      this.actor = actor;
   }

   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         baseApplication: 'ActorSheet',
         token: null,
         width: 750,
      });
   }

   /**
    * If this Actor Sheet represents a synthetic Token actor, gets a reference to the active Token.
    * @type {TokenDocument|null}
    */
   get token() {
      return this.options?.token || this.actor.token || null;
   }

   _getSheetID(document) {
      return `titan-actor-sheet-${document.isToken ? document.parent?.id : document.id}`;
   }

   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-actor-sheet');

      return retVal;
   }

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();

      // If the active user can edit this actor's tokens...
      const canEditToken = game.user.isGM || (this.actor.isOwner && game.user.can('TOKEN_CONFIGURE'));
      if (canEditToken) {
         const token = this.token;

         // Configure token button
         buttons.unshift({
            title: localize('editToken'),
            class: 'configure-token',
            icon: USER_ICON,
            onclick: (event) => this._onConfigureToken(event),
         });

         // Toggle token link for actors still in the directory
         if (token === null) {
            const tokenLinked = this.actor.prototypeToken?.actorLink;
            buttons.unshift({
               title: localize(tokenLinked ? 'tokenIsLinkedToActor' : 'tokenIsUnlinkedFromActor'),
               class: 'token-link',
               icon: tokenLinked ? LINKED_ICON : UNLINKED_ICON,
               onclick: (event) => this._toggleTokenLink(event),
            });
         }

         // For actors not in the directory (on the canvas)
         else {
            // Unlink button for linked tokens
            if (token.actorLink === true) {
               buttons.unshift({
                  title: localize('tokenIsLinkedToActor'),
                  class: 'token-link-highlight',
                  icon: LINKED_ICON,
                  onclick: (event) => this._unlinkToken(event),
               });
            }

            // Warning icon for unlinked tokens
            else {
               buttons.unshift({
                  title: localize('tokenIsUnlinkedFromActor'),
                  class: 'token-link-warning',
                  icon: UNLINKED_ICON,
                  onclick: () => {
                  },
               });
            }
         }
      }

      // Import button for actors that can be imported
      if (game.user.isGM && this.actor.pack) {
         buttons.unshift({
            class: 'import',
            icon: IMPORT_ICON,
            label: localize('import'),
            onclick: (event) => this._onImport(event),
         });
      }
      return buttons;
   }

   /**
    * Creates a dialog for configuring the Token used by this Actor.
    * @param {DOM Event} event - The DOM Event from clicking the button.
    * @returns {Promise<void>} Returns after the dialog has been created.
    * @private
    */
   async _onConfigureToken(event) {
      if (event) {
         event.preventDefault();
      }

      // If this actor is unlinked, use the token sheet.
      if (this.token) {
         await this.token.sheet.render(true, this._getDialogOffset());
      }

      // If this actor is linked, used the prototype token sheet.
      else {
         await new CONFIG.Token.prototypeSheetClass(this.actor.prototypeToken).render(true, this._getDialogOffset());
      }
   }

   /**
    * Toggles whether this Actor is linked to their Token.
    * @param {DOM Event} event - The DOM Event from clicking the button.
    * @returns {Promise<void>} Returns after the Actor has been updated.
    * @private
    */
   async _toggleTokenLink(event) {
      if (event) {
         event.preventDefault();
      }

      const isLinked = this.actor.prototypeToken.actorLink;
      const button = $(event.currentTarget);

      // If linked, replace the linked icon with the unlinked icon
      if (isLinked) {
         button.html(button.html().replace('fa-link', 'fa-unlink'));
         button.html(button.html().replace(localize('tokenIsLinkedToActor'), localize('tokenIsUnlinkedFromActor')));
      }

      // If not linked, replaced the unlinked icon with the linked icon
      else {
         button.html(button.html().replace('fa-unlink', 'fa-link'));
         button.html(button.html().replace(localize('tokenIsUnlinkedFromActor'), localize('tokenIsLinkedToActor')));
      }

      // Update the actor
      await this.actor.update({'token.actorLink': !(isLinked)});
   }

   /**
    * Unlinks a token placed in a scene from the actor to which it is currently linked.
    * @param {DOM Event} event - The DOM Event from clicking the button.
    * @returns {Promise<void>} Returns after the Actor has been updated.
    * @private
    */
   async _unlinkToken(event) {
      if (event) {
         event.preventDefault();
      }

      const button = $(event.target);

      // Unlink the actor
      const token = this.token;
      await token.update({actorLink: false});

      // Update the text of the button
      button.html(button.html().replace('Linked', 'Unlinked'));

      // Close this actor and open the new actor sheet
      const newToken = this.token;
      await this.close();
      await newToken.actor.sheet.render(true);
   }

   /**
    * Imports the Actor from a compendium pack.
    * @param {DOM Event} event - The DOM Event from clicking the button.
    * @returns {Promise<void>} Returns after the document has been imported.
    * @private
    */
   async _onImport(event) {
      if (event) {
         event.preventDefault();
      }
      await this.actor.collection.importFromCompendium(this.actor.compendium, this.actor.id);
   }

   async close(options = {}) {
      this.options.token = null;
      return super.close(options);
   }

   /**
    * Processes data when dropped onto this sheet.
    * @param {DragEvent} event - The DOM Event from dropping the button.
    * @returns {Promise<Item[]|ActiveEffect[]|boolean} The newly created embedded documents, or false if the drop was
    * not allowed.
    * @private
    */
   async _onDrop(event) {

      // Get the data from the drag event
      const data = TextEditor.getDragEventData(event);

      /**
       * A hook event that fires when some useful data is dropped onto an ActorSheet.
       * @param {Actor} actor - The Actor that the data was droped onto.
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
            game.titan.warn(`${this.actor.name} | Invalid type in _onDrop (${data.type}).`);
            break;
         }
      }

      return false;
   }

   /**
    * Handles the dropping of ActiveEffect data onto an Actor Sheet.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<ActiveEffect[]|boolean>} The created ActiveEffect object or false if it couldn't be created.
    * @protected
    */
   async _onDropActiveEffect(event, data) {
      // Create an effect from the drag data.
      const effect = await ActiveEffect.implementation.fromDropData(data);

      // Don't create new effect is this actor is the origin.
      if (!effect || this.actor.uuid === effect.parent?.uuid) {
         return false;
      }

      // Add the effect to the actor.
      return this.actor.createEmbeddedDocuments('ActiveEffect', [effect.toObject()]);
   }

   /**
    * Handle dropping of an item reference or item data onto an Actor Sheet.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[]|boolean>} The created or updated Item instances, or false if the drop was not permitted.
    * @protected
    */
   async _onDropItem(event, data) {
      // Create an item from the drag data
      const item = await Item.implementation.fromDropData(data);
      if (!item) {
         return false;
      }
      const itemData = item.toObject();

      // If this item is from this actor, sort the item rather than creating a new one
      if (this.actor.uuid === item.parent?.uuid) {
         return this._onSortItem(event, itemData);
      }

      // Otherwise, create a new item
      return this._onDropItemCreate(itemData);
   }

   /**
    * Handle the final creation of dropped Item data on the Actor.
    * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
    * @param {object[]|object} itemData - The item data requested for creation.
    * @returns {Promise<Item[]>} The created or updated Item instances.
    * @private
    */
   async _onDropItemCreate(itemData) {
      // Ensure the item data is in an array
      itemData = itemData instanceof Array ? itemData : [itemData];
      return this.actor.createEmbeddedDocuments('Item', itemData);
   }

   /**
    * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} itemData - The item data requested for sorting.
    * @returns {Promise<Item[]|false>} The the updated item instances, or false if the data was invalid.
    * @private
    */
   async _onSortItem(event, itemData) {
      // Get the drag source and drop target
      const items = this.actor.items;
      const source = items.get(itemData._id);
      const dropTarget = event.target.closest('[data-item-id]');

      // If the drop target is valid
      if (dropTarget) {
         const target = items.get(dropTarget.dataset.itemId);

         // If the dropped item is not the target
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
            const sortUpdates = SortingHelpers.performIntegerSort(source, {target, siblings});
            const updateData = sortUpdates.map((entry) => {
               const update = entry.update;
               update._id = entry.target._id;
               return update;
            });

            // Perform the update
            return this.actor.updateEmbeddedDocuments('Item', updateData);
         }
      }

      return false;
   }

   /**
    * Handle dropping of a Folder on an Actor Sheet.
    * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[]|false>} The created Item instances.
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
         return this._onDropItemCreate(droppedItemData);
      }

      return false;
   }
}
