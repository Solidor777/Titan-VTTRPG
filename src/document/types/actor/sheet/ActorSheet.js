import TitanDocumentSheet from '~/document/sheet/DocumentSheet';
import localize from '~/helpers/utility-functions/Localize.js';
import { IMPORT_ICON, LINKED_ICON, UNLINKED_ICON, USER_ICON } from '~/system/Icons.js';

export default class TitanActorSheet extends TitanDocumentSheet {
   constructor(document, options = {}) {
      const actor = document.isToken ? document.parent.actor : document;
      super(actor, options);
      this.actor = actor;
   }

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         baseApplication: 'ActorSheet',
         token: null,
      });
   }

   _getSheetID(document) {
      return `actor-sheet-${document.isToken ? document.parent?.id : document.id}`;
   }

   // Add the actor sheet class
   _getSheetClasses() {
      const retVal = super._getSheetClasses();
      retVal.push('titan-actor-sheet');

      return retVal;
   }

   // Getter for the token
   get token() {
      return this.options?.token || this.actor.token || null;
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

   // Configure token function
   async _onConfigureToken(event) {
      if (event) {
         event.preventDefault();
      }

      // If this actor is unlinked, use the token sheet.
      if (this.token) {
         return this.token.sheet.render(true, this._getDialogOffset());
      }

      // If this actor is linked, used the prototype token sheet.
      return new CONFIG.Token.prototypeSheetClass(this.actor.prototypeToken).render(true, this._getDialogOffset());
   }

   // Toggle token link
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
      return this.actor.update({ 'token.actorLink': !(isLinked) });
   }

   // Unlinking the token
   async _unlinkToken(event) {
      if (event) {
         event.preventDefault();
      }

      const button = $(event.target);

      // Unlink the actor
      const token = this.token;
      await token.update({ actorLink: false });

      // Update the text of the button
      button.html(button.html().replace('Linked', 'Unlinked'));

      // Close this actor and open the new actor sheet
      const newToken = this.token;
      await this.close();
      return newToken.actor.sheet.render(true);
   }

   // Import function
   _onImport(event) {
      if (event) {
         event.preventDefault();
      }
      return this.actor.collection.importFromCompendium(this.actor.compendium, this.actor.id);
   }

   async close(options = {}) {
      this.options.token = null;
      return super.close(options);
   }

   async _onDrop(event) {
      // Ensure the current user is the actor's owner
      if (!this.actor.isOwner) {
         return false;
      }

      const data = TextEditor.getDragEventData(event);

      /**
       * A hook event that fires when some useful data is dropped onto an ActorSheet.
       * @function dropActorSheetData
       * @memberof hookEvents
       * @param {Actor} actor      The Actor
       * @param {ActorSheet} sheet The ActorSheet application
       * @param {object} data      The data that has been dropped onto the sheet
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
         case 'Actor': {
            return this._onDropActor(event, data);
         }
         case 'Item': {
            return this._onDropItem(event, data);
         }
         case 'Folder': {
            return this._onDropFolder(event, data);
         }
         default: {
            game.titan.error('| Impossible type in _onDrop.');

            return false;
         }
      }
   }

   /**
    * Handle the dropping of ActiveEffect data onto an Actor Sheet
    * @param {DragEvent} event                  The concluding DragEvent which contains drop data
    * @param {object} data                      The data transfer extracted from the event
    * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
    * @protected
    */
   async _onDropActiveEffect(event, data) {
      // Create an effect from the drag data
      const effect = await ActiveEffect.implementation.fromDropData(data);

      // Don't create new effect is this actor is the origin
      if (!effect || this.actor.uuid === effect.parent?.uuid) {
         return false;
      }

      // Add the effect to the actor
      return this.actor.createEmbeddedDocuments('ActiveEffect', [effect.toObject()]);
   }

   /**
    * Handle dropping of an Actor data onto another Actor sheet
    * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
    *                                     not permitted.
    * @protected
    */
   async _onDropActor() {
      return false;
   }

   /**
    * Handle dropping of an item reference or item data onto an Actor Sheet
    * @param {DragEvent} event            The concluding DragEvent which contains drop data
    * @param {object} data                The data transfer extracted from the event
    * @returns {Promise<Item[]|boolean>}  The created or updated Item instances, or false if the drop was not permitted.
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
    * Handle dropping of a Folder on an Actor Sheet.
    * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
    * @param {DragEvent} event     The concluding DragEvent which contains drop data
    * @param {object} data         The data transfer extracted from the event
    * @returns {Promise<Item[]>}   The created or updated Item instances
    * @protected
    */
   async _onDropFolder(event, data) {
      // Create folder from the drop data
      const folder = await Folder.implementation.fromDropData(data);
      if (!folder || folder.type !== 'Item') {
         return;
      }

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

   /**
    * Handle the final creation of dropped Item data on the Actor.
    * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
    * @param {object[]|object} itemData     The item data requested for creation
    * @returns {Promise<Item[]>}            The created or updated Item instances
    * @private
    */
   async _onDropItemCreate(itemData) {
      // Ensure the item data is in an array
      itemData = itemData instanceof Array ? itemData : [itemData];
      return this.actor.createEmbeddedDocuments('Item', itemData);
   }

   /**
    * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings
    * @param {Event} event       The concluding DragEvent which contains drop data
    * @param {object} itemData   The item data requested for sorting
    * @private
    * @returns {Promise<Item>}   The created or updated Item instances
    */
   async _onSortItem(event, itemData) {
      // Get the drag source and drop target
      const items = this.actor.items;
      const source = items.get(itemData._id);
      const dropTarget = event.target.closest('[data-item-id]');
      if (!dropTarget) {
         return;
      }
      const target = items.get(dropTarget.dataset.itemId);

      // Don't sort an item onto itself
      if (source.id === target.id) {
         return;
      }

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
         update._id = entry.target._id;
         return update;
      });

      // Perform the update
      return this.actor.updateEmbeddedDocuments('Item', updateData);
   }
}
