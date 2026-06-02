import getEffectCompendiums from '~/sidebar/tray/GetEffectCompendiums.js';

/**
 * @class EffectTrayState
 * Reactive state for the Effect Tray: the available compendiums, the selected pack, its loaded
 * effect documents, the search filter, and expanded-folder tracking. Lives in Svelte context and is
 * read by every tray component. Refreshes itself when the selected pack's contents change.
 *
 * Public interface (read by tray components via `getContext('trayState')`):
 * - `$state` fields: `compendiums`, `selectedPackId`, `effects`, `filter`, `expandedFolders`,
 *   `folders`.
 * - Getters: `selectedPack`, `canEdit`.
 * - Methods: `selectPack`, `refresh`, `createBlankEffect`, `duplicateEffect`, `renameEffect`,
 *   `stashFromDragData`, `createFolder`, `renameFolder`, `deleteFolder`, `moveEffectToFolder`,
 *   `toggleFolder`, `destroy`.
 */
export default class EffectTrayState {

   /** @type {CompendiumCollection[]} The visible ActiveEffect packs, in display order. */
   compendiums = $state([]);

   /** @type {string} The collection id of the currently selected pack. */
   selectedPackId = $state('');

   /** @type {object[]} The loaded ActiveEffect documents for the selected pack. */
   effects = $state([]);

   /** @type {string} The current search filter text. */
   filter = $state('');

   /** @type {Set<string>} The ids of folders currently expanded. */
   expandedFolders = $state(new Set());

   /** @type {Folder[]} The folders of the selected pack, mirrored for reactive folder grouping. */
   folders = $state([]);

   /** @type {{ hook: string, id: number }[]} The registered hook ids, removed on destroy. */
   #hookIds = [];

   /**
    * Constructs the tray state and performs the initial pack discovery and load.
    */
   constructor() {
      this.compendiums = getEffectCompendiums();

      // Restore the last-selected pack, falling back to the system effects pack, then the first.
      /** @type {string} The persisted last-selected pack id. */
      const remembered = game.settings.get('titan', 'effectTrayLastPack');

      /** @type {string[]} The collection ids of every available pack. */
      const ids = this.compendiums.map((pack) => pack.collection);

      this.selectedPackId = ids.includes(remembered)
         ? remembered
         : (ids.find((id) => id === `${game.system.id}.effects`) ?? ids[0] ?? '');

      this.#registerHooks();
      void this.refresh();
   }

   /**
    * The selected CompendiumCollection, or undefined if none is selected.
    * @returns {CompendiumCollection | undefined} The selected pack.
    */
   get selectedPack() {
      return this.compendiums.find((pack) => pack.collection === this.selectedPackId);
   }

   /**
    * Whether the selected pack is editable by the current user (unlocked and owner).
    * @returns {boolean} True when CRUD actions should be enabled.
    */
   get canEdit() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      return !!pack
         && !pack.locked
         && pack.getUserLevel(game.user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
   }

   /**
    * Selects a pack by id, persists the choice, and reloads its contents.
    * @param {string} packId - The collection id of the pack to select.
    * @returns {Promise<void>}
    */
   async selectPack(packId) {
      this.selectedPackId = packId;
      await game.settings.set('titan', 'effectTrayLastPack', packId);
      await this.refresh();
   }

   /**
    * Reloads the selected pack's documents into reactive state. TITAN system packs show only
    * effect-subtype Active Effects; user (world/module) packs show all Active Effects.
    * @returns {Promise<void>}
    */
   async refresh() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack) {
         this.effects = [];
         this.folders = [];
         return;
      }

      /** @type {object[]} The full documents in the selected pack. */
      const documents = await pack.getDocuments();

      // Discard a stale load if the selection changed while documents were loading.
      if (this.selectedPackId !== pack.collection) {
         return;
      }

      /** @type {boolean} Whether the selected pack belongs to the system (TITAN). */
      const isSystemPack = pack.metadata.packageType === 'system';

      this.effects = isSystemPack
         ? documents.filter((effect) => effect.type === 'effect')
         : documents;

      // Mirror the pack's folder documents for reactive grouping (empty when the pack lacks folders).
      this.folders = pack.folders ? Array.from(pack.folders.values()) : [];
   }

   /**
    * Creates a blank effect-subtype Active Effect in the selected pack and opens its sheet. No-ops
    * when there is no selected pack or the current user cannot edit it.
    * @returns {Promise<void>}
    */
   async createBlankEffect() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !this.canEdit) {
         return;
      }

      /** @type {ActiveEffect[]} The created effect documents. */
      const [created] = await pack.documentClass.createDocuments(
         [
            {
               name: game.i18n.localize('LOCAL.effectTrayNewName.text'),
               type: 'effect',
            },
         ],
         { pack: pack.collection },
      );

      created?.sheet?.render(true);
   }

   /**
    * Duplicates an effect within the selected pack, appending a "(Copy)" suffix to its name. No-ops
    * when there is no selected pack or the current user cannot edit it.
    * @param {ActiveEffect} effect - The effect to duplicate.
    * @returns {Promise<void>}
    */
   async duplicateEffect(effect) {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !this.canEdit) {
         return;
      }

      /** @type {object} The serialized effect data for the duplicate. */
      const data = effect.toObject();
      data.name = `${data.name} ${game.i18n.localize('LOCAL.effectTrayCopySuffix.text')}`;
      delete data._id;

      await pack.documentClass.createDocuments([data], { pack: pack.collection });
   }

   /**
    * Renames an effect in the selected pack. No-ops when the current user cannot edit, the name is
    * empty, or the name is unchanged.
    * @param {ActiveEffect} effect - The effect to rename.
    * @param {string} name - The new name.
    * @returns {Promise<void>}
    */
   async renameEffect(effect, name) {
      if (!this.canEdit || !name || name === effect.name) {
         return;
      }

      await effect.update({ name });
   }

   /**
    * Copies an effect described by Foundry drag data into the selected pack. Used by the tray's
    * drop zone to stash an actor's (or another pack's) effect. No-ops when there is no selected
    * pack, the current user cannot edit it, or the drag data is not an Active Effect.
    * @param {object} dragData - Foundry drag data (expects type 'ActiveEffect' with a uuid).
    * @returns {Promise<void>}
    */
   async stashFromDragData(dragData) {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !this.canEdit || dragData?.type !== 'ActiveEffect') {
         return;
      }

      /** @type {ActiveEffect | null} The source effect resolved from the drag data. */
      const source = await getDocumentClass('ActiveEffect').fromDropData(dragData);
      if (!source) {
         return;
      }

      // Do not stash an effect that already lives in the selected pack (an in-tray move, not an import).
      if (source.pack === pack.collection) {
         return;
      }

      /** @type {object} The serialized effect data, stripped of its source id for a fresh create. */
      const data = source.toObject();
      delete data._id;

      await pack.documentClass.createDocuments([data], { pack: pack.collection });
   }

   /**
    * Creates a new folder in the selected pack. No-ops when there is no selected pack, the pack does
    * not support folders, or the current user cannot edit it.
    * @param {string} [name] - The folder name; defaults to the localized "New Folder" label.
    * @returns {Promise<void>}
    */
   async createFolder(name = game.i18n.localize('LOCAL.effectTrayNewFolderName.text')) {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !pack.folders || !this.canEdit) {
         return;
      }

      await getDocumentClass('Folder').create(
         {
            name,
            type: pack.documentName,
         },
         { pack: pack.collection },
      );
   }

   /**
    * Renames a folder in the selected pack. No-ops when the current user cannot edit, the name is
    * empty, or the name is unchanged.
    * @param {Folder} folder - The folder to rename.
    * @param {string} name - The new folder name.
    * @returns {Promise<void>}
    */
   async renameFolder(folder, name) {
      if (!this.canEdit || !name || name === folder.name) {
         return;
      }

      await folder.update({ name });
   }

   /**
    * Deletes a folder from the selected pack, leaving its effects at the pack root. No-ops when the
    * current user cannot edit the pack.
    * @param {Folder} folder - The folder to delete.
    * @returns {Promise<void>}
    */
   async deleteFolder(folder) {
      if (!this.canEdit) {
         return;
      }

      // The registered `deleteFolder` hook drives the reload once the deletion completes.
      await folder.delete();
   }

   /**
    * Moves an effect into a folder (or to the pack root when folderId is null). No-ops when the
    * current user cannot edit the pack.
    * @param {ActiveEffect} effect - The effect to move.
    * @param {string | null} folderId - The destination folder id, or null for the pack root.
    * @returns {Promise<void>}
    */
   async moveEffectToFolder(effect, folderId) {
      if (!this.canEdit) {
         return;
      }

      await effect.update({ folder: folderId });
   }

   /**
    * Toggles the expanded state of a folder by id, mutating the reactive expanded-folders set.
    * @param {string} folderId - The id of the folder to expand or collapse.
    * @returns {void}
    */
   toggleFolder(folderId) {
      /** @type {Set<string>} A new set so the reactive assignment is observed by Svelte. */
      const next = new Set(this.expandedFolders);
      if (next.has(folderId)) {
         next.delete(folderId);
      }
      else {
         next.add(folderId);
      }

      this.expandedFolders = next;
   }

   /**
    * Registers Foundry hooks that refresh the tray when the selected pack's contents change. The
    * registration ids are stored so the listeners can be removed in `destroy()`, preventing leaks
    * when the sidebar popout path constructs a second tray state.
    * @returns {void}
    */
   #registerHooks() {
      /**
       * Refreshes the tray only when the changed document (an effect or folder) belongs to the
       * currently-selected pack.
       * @param {object} document - The ActiveEffect or Folder document that changed.
       * @returns {void}
       */
      const onChange = (document) => {
         if (document?.pack === this.selectedPackId) {
            void this.refresh();
         }
      };

      /** @type {string[]} The document-change hooks that should refresh the tray. */
      const hooks = [
         'createActiveEffect',
         'updateActiveEffect',
         'deleteActiveEffect',
         'createFolder',
         'updateFolder',
         'deleteFolder',
      ];

      for (const hook of hooks) {
         /** @type {number} The hook registration id returned by Hooks.on. */
         const id = Hooks.on(hook, onChange);
         this.#hookIds.push({ hook, id });
      }
   }

   /**
    * Removes every registered Foundry hook and clears the stored ids. Called when the owning tab
    * closes so a reopened tab builds a fresh state with fresh hooks.
    * @returns {void}
    */
   destroy() {
      for (const { hook, id } of this.#hookIds) {
         Hooks.off(hook, id);
      }

      this.#hookIds = [];
   }
}
