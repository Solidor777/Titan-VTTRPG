import { SvelteApplication } from '@typhonjs-fvtt/runtime/svelte/application';
import { TJSDocument } from '@typhonjs-fvtt/runtime/svelte/store';
import { writable } from 'svelte/store';
import { localize } from '~/helpers/Utility.js';
import DocumentShell from './DocumentShell.svelte';
export default class SvelteDocumentSheet extends SvelteApplication {
   /**
    * Document store that monitors updates to any assigned document.
    *
    * @type {TJSDocument<foundry.abstract.Document>}
    */
   #documentStore = new TJSDocument(void 0, { delete: this.close.bind(this) });

   /**
    * Application store that monitors updates to any assigned document.
    * @type {writable<object>}
    */
   #applicationStateStore = new writable({});

   /**
    * Holds the document unsubscription function.
    *
    * @type {Function}
    */
   #storeUnsubscribe;

   constructor(document, options = {}) {
      super(foundry.utils.mergeObject(
         options,
         {
            id: `document-sheet-${document.id}`,
            title: document.name,
         }
      ));

      Object.defineProperty(this.reactive, 'document', {
         get: () => this.#documentStore.get(),
         set: (document) => {
            this.#documentStore.set(document);
         },
      });
      this.reactive.document = document;

      Object.defineProperty(this.reactive, 'state', {
         get: () => this.#applicationStateStore,
         set: (state) => {
            this.#applicationStateStore = state;
         },
      });
   }

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
         width: 800,
         height: 600,
         resizable: true,
         minimizable: true,
         dragDrop: [{ dragSelector: '.directory-list .item', dropSelector: null }],
         svelte: {
            class: DocumentShell,
            target: document.body,
            props: function () {
               return {
                  documentStore: this.#documentStore,
                  applicationStateStore: this.#applicationStateStore
               };
            },
         },
      });
   }

   _getHeaderButtons() {
      const buttons = super._getHeaderButtons();
      buttons.unshift({
         class: 'configure-sheet',
         icon: 'fas fa-cog',
         title: localize('openSheetConfigurator'),
         onclick: (ev) => this._onConfigureSheet(ev),
      });
      return buttons;
   }

   // Drag Drop Handling
   _canDragStart(selector) {
      return true;
   }
   _canDragDrop(selector) {
      return this.reactive.document.isOwner || game.user.isGM;
   }
   _onDragOver(event) { }

   _onDragStart(event) {
      {
         const li = event.currentTarget;
         if (event.target.classList.contains('content-link')) {
            return;
         }

         // Create drag data
         let dragData;

         // Owned Items
         if (li.dataset.itemId) {
            const item = this.actor.items.get(li.dataset.itemId);
            dragData = item.toDragData();
         }

         // Active Effect
         if (li.dataset.effectId) {
            const effect = this.actor.effects.get(li.dataset.effectId);
            dragData = effect.toDragData();
         }

         if (!dragData) {
            return;
         }

         // Set data transfer
         event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
      }
   }
   async _onDrop(event) {
      if (this.reactive.document.documentName !== 'Actor') {
         return;
      }
      const data = TextEditor.getDragEventData(event);
      const actor = this.reactive.document;

      /**
       * A hook event that fires when some useful data is dropped onto an ActorSheet.
       * @function dropActorSheetData
       * @memberof hookEvents
       * @param {Actor} actor      The Actor
       * @param {ActorSheet} sheet The ActorSheet application
       * @param {object} data      The data that has been dropped onto the sheet
       */
      const allowed = Hooks.call('dropActorSheetData', actor, this, data);
      if (allowed === false) {
         return;
      }

      // Handle different data types
      switch (data.type) {
         case 'ActiveEffect': {
            return this._onDropActiveEffect(event, data, actor);
         }
         case 'Actor': {
            return this._onDropActor(event, data, actor);
         }
         case 'Item': {
            return this._onDropItem(event, data, actor);
         }
         case 'Folder': {
            return this._onDropFolder(event, data, actor);
         }
         default: {
            console.error('TITAN | Impossible type in _onDrop.');
            console.trace();

            return false;
         }
      }
   }

   async _onDropActiveEffect(event, data, actor) {
      const effect = await ActiveEffect.implementation.fromDropData(data);
      if (!actor.isOwner || !effect) {
         return false;
      }
      if (actor.uuid === effect.parent.uuid) {
         return false;
      }
      return ActiveEffect.create(effect.toObject(), { parent: actor });
   }

   async _onDropActor(event, data, actor) {
      if (!actor.isOwner) {
         return false;
      }
   }

   async _onDropItem(event, data, actor) {
      if (!actor.isOwner) {
         return false;
      }
      const item = await Item.implementation.fromDropData(data);
      const itemData = item.toObject();

      // Handle item sorting within the same Actor
      if (actor.uuid === item.parent?.uuid) {
         return this._onSortItem(event, itemData, actor);
      }

      // Create the owned item
      return this._onDropItemCreate(itemData, actor);
   }

   async _onDropFolder(event, data, actor) {
      if (!actor.isOwner) {
         return [];
      }
      if (data.documentName !== 'Item') {
         return [];
      }
      const folder = await Folder.implementation.fromDropData(data);
      if (!folder) {
         return [];
      }
      return this._onDropItemCreate(
         folder.contents.map((item) => {
            return game.items.fromCompendium(item);
         })
      );
   }

   async _onDropItemCreate(itemData, actor) {
      itemData = itemData instanceof Array ? itemData : [itemData];
      return actor.createEmbeddedDocuments('Item', itemData);
   }

   _onSortItem(event, itemData, actor) {
      // Get the drag source and drop target
      const items = actor.items;
      const source = items.get(itemData._id);
      const dropTarget = event.target.closest('[data-item-id]');
      if (!dropTarget) {
         return;
      }
      const target = items.get(dropTarget.dataset.itemId);

      // Don't sort on yourself
      if (source.id === target.id) {
         return;
      }

      // Identify sibling items based on adjacent HTML elements
      const siblings = [];
      for (let el of dropTarget.parentElement.children) {
         const siblingId = el.dataset.itemId;
         if (siblingId && (siblingId !== source.id)) {
            siblings.push(items.get(el.dataset.itemId));
         }
      }

      // Perform the sort
      const sortUpdates = SortingHelpers.performIntegerSort(source, { target, siblings });
      const updateData = sortUpdates.map((u) => {
         const update = u.update;
         update._id = u.target._id;
         return update;
      });

      // Perform the update
      return actor.updateEmbeddedDocuments('Item', updateData);

   }

   _onConfigureSheet(event) {
      if (event) {
         event.preventDefault();
      }
      // eslint-disable-next-line no-undef
      new DocumentSheetConfig(this.reactive.document, {
         top: this.position.top + 40,
         left: this.position.left + (this.position.width - SvelteDocumentSheet.defaultOptions.width) / 2,
      }).render(true);
   }

   _onConfigureToken(event) {
      if (event) {
         event.preventDefault();
      }
      const actor = this.reactive.document;
      const token = actor.isToken ? actor.token : actor.prototypeToken;
      new CONFIG.Token.prototypeSheetClass(token, {
         left: Math.max(this.position.left - 560 - 10, 10),
         top: this.position.top,
      }).render(true);
   }

   async close(options = {}) {
      await super.close(options);

      if (this.#storeUnsubscribe) {
         this.#storeUnsubscribe();
         this.#storeUnsubscribe = void 0;
      }
   }

   /**
    * Handles any changes to document.
    *
    * @param {foundry.abstract.Document}  doc -
    *
    * @param {object}                     options -
    */
   async #handleDocUpdate(doc, options) {
      const { action, data, documentType } = options;

      // I need to add a 'subscribe' action to TJSDocument so must check void.
      if ((action === void 0 || action === 'update' || action === 'subscribe') && doc) {
         this.reactive.title = doc?.isToken ? `[Token] ${doc?.name}` : doc?.name ?? 'No Document Assigned';
      }
   }

   render(force = false, options = {}) {
      if (!this.#storeUnsubscribe) {
         this.#storeUnsubscribe = this.#documentStore.subscribe(this.#handleDocUpdate.bind(this));
      }
      super.render(force, options);
      return this;
   }
}
