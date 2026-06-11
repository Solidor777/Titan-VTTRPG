import TitanDocumentSheet from '~/document/sheet/TitanDocumentSheet.js';
import ActorSheetHeaderButtons from '~/document/types/actor/sheet/ActorSheetHeaderButtons.svelte';
import warn from '~/helpers/utility-functions/Warn.js';
import assert from '~/helpers/utility-functions/Assert.js';
import mergeArrays from '~/helpers/utility-functions/MergeArrays.js';
import resolveDocumentSheetArguments from '~/helpers/utility-functions/ResolveDocumentSheetArguments.js';
import localize from '~/helpers/utility-functions/Localize.js';
import { EDIT_TOKEN_ICON, IMPORT_ICON, LINKED_ICON, UNLINKED_ICON } from '~/system/Icons.js';

/**
 * A Document Sheet class with functionality shared by all Actors.
 * @extends {TitanDocumentSheet}
 */
export default class TitanActorSheet extends TitanDocumentSheet {
   /** @type {foundry.applications.ux.DragDrop | null} The drop controller bound to the sheet element. */
   #dragDrop = null;

   /** @type {TokenDocument | null} The placed Token captured from an open-with-token render. */
   #originToken = null;

   /**
    * Resolves the synthetic-token Actor, merges the Actor sheet CSS classes, and stores the Actor on the sheet.
    * @param {TitanActor} sheetDocument - The Document this sheet is for.
    * @param {object} [options={}] - Application configuration options.
    */
   constructor(sheetDocument, options = {}) {
      // Resolve the polymorphic constructor arguments before inspecting the document (Foundry v14 passes
      // `{ document }`; TITAN callers may pass it positionally).
      const { document: resolvedDocument, options: resolvedOptions } =
         resolveDocumentSheetArguments(sheetDocument, options);

      // Calculate whether this sheet's Actor is a token or a proxy.
      const actor = resolvedDocument.isToken ? resolvedDocument.parent.actor : resolvedDocument;
      resolvedOptions.token ??= null;

      // Add sheet classes.
      const classes = ['titan-actor-sheet'];
      resolvedOptions.classes = resolvedOptions.classes
         ? mergeArrays(classes, resolvedOptions.classes)
         : classes;

      super(actor, resolvedOptions);

      /** @type {TitanActor} The Actor this sheet belongs to. */
      this.actor = actor;
   }

   /**
    * Default Application options. AppV2 merges `DEFAULT_OPTIONS` down the class chain onto the base
    * defined in TitanDocumentSheet, so only the actor-specific width override is needed here.
    * @override
    */
   static DEFAULT_OPTIONS = {
      position: { width: 750 },
   };

   /**
    * Capture the placed Token the canvas passes when a token is double-clicked. A LINKED token opens
    * its world Actor's sheet, which otherwise cannot know which placed Token it was opened from —
    * and the header's unlink control would fall back to the prototype-link toggle.
    * @override
    * @param {object} options - Render options, possibly carrying the originating Token document.
    * @protected
    */
   _configureRenderOptions(options) {
      super._configureRenderOptions(options);
      if (options.token) {
         this.#originToken = options.token;
      }
   }

   /**
    * Bind the drop controller to the sheet element on every render. ApplicationV2 wires no drag-drop
    * handlers itself, so without this binding `_onDrop` never fires and sheet drops silently no-op.
    * @override
    * @param {object} context - Prepared render context.
    * @param {object} options - Render options.
    * @returns {Promise<void>} Resolves once the listeners are bound.
    * @protected
    */
   async _onRender(context, options) {
      await super._onRender(context, options);

      // The cached drop controller, created on first render.
      this.#dragDrop ??= new foundry.applications.ux.DragDrop.implementation({
         permissions: {
            drop: () => this.isEditable,
         },
         callbacks: {
            drop: this._onDrop.bind(this),
         },
      });
      this.#dragDrop.bind(this.element);
   }

   /**
    * Build the native AppV2 header controls for this Actor sheet. These render in the window's
    * header controls dropdown (the ellipsis menu). Computed on each frame render so the dynamic
    * link/unlink control reflects the current token-link state.
    * @override
    * @returns {ApplicationHeaderControlsEntry[]} The header control entries to render.
    * @protected
    */
   _getHeaderControls() {
      /** @type {ApplicationHeaderControlsEntry[]} The accumulated control entries. */
      const controls = super._getHeaderControls();

      // Whether the active user may edit this Actor's tokens.
      const canEditToken = game.user.isGM || (this.actor.isOwner && game.user.can('TOKEN_CONFIGURE'));
      if (canEditToken) {
         // The active (placed) Token document, or null when the Actor lives in the directory.
         const token = this.token;

         // Edit Token control: opens the active Token's config when placed, otherwise the prototype config.
         controls.push({
            action: 'titanEditToken',
            icon: EDIT_TOKEN_ICON,
            label: localize('editToken'),
            onClick: () => this._onEditToken(),
         });

         // Dynamic link/unlink control: icon and label reflect the current link state.
         controls.push(this._getTokenLinkControl(token));
      }

      // Import control for Actors loaded from a compendium pack.
      if (game.user.isGM && this.actor.pack) {
         controls.push({
            action: 'titanImportActor',
            icon: IMPORT_ICON,
            label: localize('importActor'),
            onClick: () => this._onImportActor(),
         });
      }

      return controls;
   }

   /**
    * Build the dynamic token link/unlink header control whose icon and label reflect the current
    * token-link state.
    * @param {TokenDocument | null} token - The active Token document, or null for directory Actors.
    * @returns {ApplicationHeaderControlsEntry} The link/unlink control entry.
    * @protected
    */
   _getTokenLinkControl(token) {
      // Directory Actor: toggle the prototype token's link state. The icon reflects the current
      // state and the label states the action that clicking will perform.
      if (token === null) {
         /** @type {boolean} Whether the prototype token is currently linked. */
         const isLinked = this.actor.prototypeToken?.actorLink === true;
         return {
            action: 'titanToggleTokenLink',
            icon: isLinked ? LINKED_ICON : UNLINKED_ICON,
            label: localize('toggleTokenLink'),
            onClick: () => this._onToggleTokenLink(),
         };
      }

      // Placed, linked Token: offer an irreversible unlink action.
      if (token.actorLink === true) {
         return {
            action: 'titanUnlinkToken',
            icon: LINKED_ICON,
            label: localize('unlinkToken'),
            onClick: () => this._onUnlinkToken(),
         };
      }

      // Placed, already-unlinked Token: informational entry (unlink is irreversible).
      return {
         action: 'titanUnlinkedToken',
         icon: UNLINKED_ICON,
         label: localize('tokenUnlinked'),
         onClick: () => {},
      };
   }

   /**
    * Supply the always-visible actor header-buttons component for the window header.
    * @override
    * @returns {import('svelte').Component} The component rendering the import, edit-token, and link-state buttons.
    * @protected
    */
   _getHeaderButtonsComponent() {
      return ActorSheetHeaderButtons;
   }

   /**
    * Open the appropriate Token configuration for this Actor: the active Token's config when the
    * Actor is placed, otherwise the prototype Token config.
    * @protected
    */
   _onEditToken() {
      // Placed Token: edit the active Token document directly.
      if (this.token) {
         this.token.sheet.render({ force: true });
         return;
      }

      // Directory Actor: edit the prototype Token.
      new CONFIG.Token.prototypeSheetClass({ prototype: this.actor.prototypeToken }).render({ force: true });
   }

   /**
    * Toggle whether this Actor's prototype Token is linked, then re-render so the control updates.
    * @returns {Promise<void>} Resolves once the prototype token has been updated.
    * @protected
    */
   async _onToggleTokenLink() {
      // Flip the prototype token link state.
      await this.actor.prototypeToken.update({
         actorLink: !this.actor.prototypeToken.actorLink,
      });

      // Re-render the frame so the dynamic control's icon and label refresh.
      this.render({ parts: [] });
   }

   /**
    * Irreversibly unlink the active Token from this Actor, then reopen the now-synthetic Actor's sheet.
    * @returns {Promise<void>} Resolves once the token has been unlinked and the sheet reopened.
    * @protected
    */
   async _onUnlinkToken() {
      // Unlink the active token. The reference is taken BEFORE the update: afterwards the token
      // resolves a synthetic actor, so this sheet's token getter no longer returns it.
      const token = this.token;
      if (!assert(token, 'Cannot unlink %s: the sheet has no active Token.', this.actor.name)) {
         return;
      }
      await token.update({ actorLink: false });

      // Close this sheet and open the now-synthetic Actor's sheet for the same token.
      await this.close();
      token.actor.sheet.render({ force: true });
   }

   /**
    * Import this Actor from its compendium pack into the game world.
    * @returns {Promise<Document>} The imported Actor document.
    * @protected
    */
   async _onImportActor() {
      return this.actor.collection.importFromCompendium(this.actor.compendium, this.actor.id);
   }

   /**
    * The active placed Token for this sheet: the synthetic Actor's own token, or the captured
    * originating Token when a LINKED token opened this world Actor's sheet. The captured token only
    * counts while it still exists on its scene and still resolves to this Actor.
    * @type {TokenDocument | null}
    */
   get token() {
      // Synthetic token Actor: the Actor knows its own token.
      if (this.actor.token) {
         return this.actor.token;
      }

      /** @type {TokenDocument | null} The Token captured from the opening double-click. */
      const captured = this.#originToken ?? this.options?.token;
      if (captured && captured.actor === this.actor && captured.parent?.tokens.has(captured.id)) {
         return captured;
      }

      return null;
   }

   /**
    * Handles the dropping of ActiveEffect data onto an Actor Sheet.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<ActiveEffect[] | boolean>} The created ActiveEffect
    * instances, or false if the effect couldn't be created.
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
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[] | boolean>} The created or updated Item instances,
    * or false if the drop was not permitted.
    * @protected
    */
   async _onDropItem(event, data) {
      // Create an item from the drag data.
      /** @type {TitanItem} */
      const item = await Item.implementation.fromDropData(data);
      if (!item) {
         return false;
      }

      // Make the item data into an object.
      const itemData = item.toObject();

      // If this item is from this sheet's Actor, sort the item rather than.
      // creating a new one.
      if (this.actor.uuid === item.parent?.uuid) {
         return this._onSortItem(event, itemData);
      }

      // Otherwise, create a new item.
      return this.actor.addItem(itemData);
   }

   /**
    * Handle a drop event for an existing embedded Item to sort that Item relative to its siblings.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} itemData - The item data requested for sorting.
    * @returns {Promise<TitanItem[] | boolean>} The updated item instances, or false if the data was invalid.
    * @private
    */
   async _onSortItem(event, itemData) {
      // Get the drag source and drop target.
      const items = this.actor.items;
      const source = items.get(itemData.id);
      const dropTarget = event.target.closest('[data-item-id]');

      // If the drop target is valid.
      if (dropTarget) {
         const target = items.get(dropTarget.dataset.itemId);

         // If the dropped item is the target.
         if (source.id === target.id) {

            // Identify sibling items based on adjacent HTML elements.
            const siblings = [];
            for (let itemElement of dropTarget.parentElement.children) {
               const siblingId = itemElement.dataset.itemId;
               if (siblingId && (siblingId !== source.id)) {
                  siblings.push(items.get(itemElement.dataset.itemId));
               }
            }

            // Perform the sort.
            const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
            const updateData = sortUpdates.map((entry) => {
               const update = entry.update;
               update.id = entry.target.id;
               return update;
            });

            // Perform the update.
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
    * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @param {object} data - The data transfer extracted from the event.
    * @returns {Promise<Item[] | boolean>} The created Item instances, or false if the folder was invalid or not of type
    * Item.
    * @protected
    */
   async _onDropFolder(event, data) {
      // Create folder from the drop data.
      const folder = await Folder.implementation.fromDropData(data);
      if (folder && folder.type !== 'Item') {

         // Get the contents of the folder.
         const droppedItemData = await Promise.all(folder.contents.map(async (item) => {
            if (!(item instanceof Item)) {
               item = await fromUuid(item.uuid);
            }
            return item.toObject();
         }));

         // Add the folder contents to the actor.
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
    * @param {DragEvent} event - The concluding DragEvent which contains drop data.
    * @returns {Promise<Item[] | ActiveEffect[] | boolean>} The newly created
    * embedded documents, or false if the drop was not allowed.
    * @protected
    */
   async _onDrop(event) {
      // Get the data from the drag event.
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

      /**
       * A hook event that fires when some useful data is dropped onto an ActorSheet.
       * @param {Actor} actor - The Actor that the data was dropped onto.
       * @param {ActorSheet} sheet - The ActorSheet application.
       * @param {object} data - The data that has been dropped onto the sheet.
       */
      const allowed = Hooks.call('dropActorSheetData', this.actor, this, data);
      if (allowed === false) {
         return false;
      }

      // Handle different data types.
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
