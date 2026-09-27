import ConfirmationDialog from '~/helpers/dialogs/ConfirmationDialog.js';
import localize from '~/helpers/utility-functions/Localize.js';
import getEffectCompendiums from '~/sidebar/tray/GetEffectCompendiums.js';

/**
 * @typedef {object} EffectTrayNode
 * One folder of the tray's folder tree, mirroring a node of the pack's core `tree`.
 * @property {Folder} folder - The folder document.
 * @property {number} depth - The folder's nesting depth (1 for a top-level folder).
 * @property {EffectTrayNode[]} children - The child folders, in the pack's sort order.
 * @property {object[]} effects - The loaded effects directly inside this folder, in the pack's sort order.
 */

/**
 * @typedef {object} EffectTrayTree
 * The root of the tray's folder tree.
 * @property {EffectTrayNode[]} children - The top-level folders.
 * @property {object[]} effects - The loaded effects outside any folder.
 */

/**
 * @class EffectTrayState
 * Reactive state for the Effect Tray: the available compendiums, the selected pack, its loaded
 * effect documents arranged in the pack's folder tree, the search filter and mode, and expanded-folder
 * tracking. Lives in Svelte context and is read by every tray component. Refreshes itself when the
 * selected pack's contents change.
 *
 * The tree mirrors the pack's core `tree` (`DirectoryCollectionMixin`), so folder nesting and sort order
 * match the core compendium and sidebar directories, including the pack's alphabetical/manual sorting
 * mode. Expanded folders follow core directory behavior: folders start collapsed, collapsing a folder
 * collapses its descendants, and the set lasts for the life of the tray state (the session).
 *
 * Public interface (read by tray components via `getContext('trayState')`):
 * - `$state` fields: `compendiums`, `selectedPackId`, `effects`, `tree`, `filter`, `expandedFolders`,
 * `isLocked`, `searchMode`, `sortingMode`.
 * - Getters: `selectedPack`, `isOwner`, `canEdit`, `supportsFolders`, `folderOptions`.
 * - Methods: `selectPack`, `refresh`, `createBlankEffect`, `duplicateEffect`, `requestDeleteEffect`,
 * `renameEffect`, `stashFromDragData`, `createFolder`, `renameFolder`, `deleteFolder`, `moveEffectToFolder`,
 * `toggleFolder`, `collapseAllFolders`, `toggleSearchMode`, `toggleSortingMode`, `toggleLock`, `destroy`.
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

   /** @type {Set<string>} The uuids of folders currently expanded (empty until the user expands one). */
   expandedFolders = $state(new Set());

   /**
    * @type {EffectTrayTree} The selected pack's folder tree holding its loaded effects. Raw state: the
    * nodes hold Foundry documents, and the tree is replaced wholesale on every refresh.
    */
   tree = $state.raw({
      children: [],
      effects: [],
   });

   /** @type {boolean} Reactive mirror of the selected pack's locked state, so the UI reacts to it. */
   isLocked = $state(true);

   /** @type {string} Reactive mirror of the selected pack's core search mode (name or full text). */
   searchMode = $state(CONST.DIRECTORY_SEARCH_MODES.NAME);

   /** @type {string} Reactive mirror of the selected pack's core sorting mode ('a' alphabetical, 'm' manual). */
   sortingMode = $state('a');

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

      // Seed the lock mirror synchronously so CRUD affordances are correct before the first refresh.
      this.isLocked = !!this.selectedPack?.locked;

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
    * Whether the current user owns the selected pack (a GM for world/module packs).
    * @returns {boolean} True when the user can manage the pack (lock, configure).
    */
   get isOwner() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      return !!pack && pack.getUserLevel(game.user) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
   }

   /**
    * Whether the selected pack is editable by the current user (owned and unlocked). Reads the
    * reactive `isLocked` mirror so CRUD affordances update when the lock is toggled.
    * @returns {boolean} True when CRUD actions should be enabled.
    */
   get canEdit() {
      return !this.isLocked && this.isOwner;
   }

   /**
    * Whether the selected pack supports folders (compendium packs expose a folders collection).
    * @returns {boolean} True when folders can be shown and created.
    */
   get supportsFolders() {
      return !!this.selectedPack?.folders;
   }

   /**
    * The selected pack's folders in tree order, each labelled with a depth prefix the way core formats
    * folder select options (`─` per nesting level below the top).
    * @returns {{ value: string, label: string }[]} The folder options for a folder picker.
    */
   get folderOptions() {
      /** @type {{ value: string, label: string }[]} The options collected in depth-first tree order. */
      const options = [];

      /**
       * Appends a node's folder and then its descendants.
       * @param {EffectTrayNode} node - The folder node to visit.
       * @returns {void}
       */
      const visit = (node) => {
         options.push({
            value: node.folder.id,
            label: `${'─'.repeat(node.depth - 1)} ${node.folder.name}`.trim(),
         });
         node.children.forEach(visit);
      };
      this.tree.children.forEach(visit);
      return options;
   }

   /**
    * Toggles the locked state of the selected pack. GM/owner only; persists via `pack.configure` and
    * updates the reactive `isLocked` mirror so the UI and `canEdit` react immediately.
    * @returns {Promise<void>}
    */
   async toggleLock() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !this.isOwner) {
         return;
      }

      /** @type {boolean} The target locked state, applied to the pack and mirrored locally. */
      const nextLocked = !pack.locked;
      await pack.configure({ locked: nextLocked });
      this.isLocked = nextLocked;
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
    * Reloads the selected pack's documents and folder tree into reactive state. TITAN system packs show
    * only effect-subtype Active Effects; user (world/module) packs show all Active Effects.
    * @returns {Promise<void>}
    */
   async refresh() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack) {
         this.effects = [];
         this.tree = {
            children: [],
            effects: [],
         };
         this.isLocked = true;
         return;
      }

      this.isLocked = !!pack.locked;
      this.searchMode = pack.searchMode;
      this.sortingMode = pack.sortingMode;

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

      this.#buildTree(pack);
   }

   /**
    * Rebuilds `tree` from the pack's core folder tree, swapping each index entry for its loaded effect.
    * The core tree is rebuilt first because it does not yet include a created folder, a created effect, or
    * an effect's move between folders when the create/update hooks that trigger this refresh fire. Entries
    * without a loaded effect (the non-effect subtypes a system pack hides) are dropped.
    * @param {CompendiumCollection} pack - The selected pack.
    * @returns {void}
    */
   #buildTree(pack) {
      pack.initializeTree();

      /** @type {Map<string, object>} The displayed effects keyed by id. */
      const byId = new Map(this.effects.map((effect) => [
         effect.id,
         effect,
      ]));

      /**
       * Maps a core tree node's index entries to the loaded effects, preserving the core order.
       * @param {object[]} entries - The core node's index entries.
       * @returns {object[]} The matching loaded effects.
       */
      const toEffects = (entries) => entries.map((entry) => byId.get(entry._id)).filter(Boolean);

      /**
       * Converts a core folder node (and its descendants) into a tray node.
       * @param {object} node - The core tree node.
       * @returns {EffectTrayNode} The tray node.
       */
      const toNode = (node) => ({
         folder: node.folder,
         depth: node.depth,
         children: node.children.map(toNode),
         effects: toEffects(node.entries),
      });

      this.tree = {
         children: pack.tree.children.map(toNode),
         effects: toEffects(pack.tree.entries),
      };
   }

   /**
    * Creates a blank effect-subtype Active Effect in the selected pack, optionally inside a folder, and
    * opens its sheet. No-ops when there is no selected pack or the current user cannot edit it.
    * @param {string | null} [folderId] - The folder to create the effect in, or null for the pack root.
    * @returns {Promise<void>}
    */
   async createBlankEffect(folderId = null) {
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
               folder: folderId,
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
    * Prompts for confirmation, then deletes the effect from its pack on confirm. No-ops when the
    * current user cannot edit the selected pack.
    * @param {ActiveEffect} effect - The effect to delete.
    * @returns {void}
    */
   requestDeleteEffect(effect) {
      if (!this.canEdit) {
         return;
      }

      /** @type {string} The localized Delete label, reused as title and confirm-button text. */
      const label = localize('effectTrayDelete');
      new ConfirmationDialog(
         label,
         [effect.name],
         localize('effectTrayConfirmDelete.desc'),
         label,
         () => effect.delete(),
      ).render(true);
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
    * Creates a new folder in the selected pack, optionally nested inside a parent folder. No-ops when there
    * is no selected pack, the pack does not support folders, or the current user cannot edit it.
    * @param {Folder | null} [parent] - The parent folder, or null for a top-level folder.
    * @param {string} [name] - The folder name; defaults to the localized "New Folder" label.
    * @returns {Promise<void>}
    */
   async createFolder(parent = null, name = game.i18n.localize('LOCAL.effectTrayNewFolderName.text')) {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack || !pack.folders || !this.canEdit) {
         return;
      }

      await getDocumentClass('Folder').create(
         {
            name,
            type: pack.documentName,
            folder: parent?.id ?? null,
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
    * Toggles a folder node open or closed. Collapsing also collapses every descendant folder, as the core
    * directories do, so reopening a folder shows its subfolders closed.
    * @param {EffectTrayNode} node - The folder node to expand or collapse.
    * @returns {void}
    */
   toggleFolder(node) {
      /** @type {Set<string>} A new set so the reactive assignment is observed by Svelte. */
      const next = new Set(this.expandedFolders);
      if (next.has(node.folder.uuid)) {

         /**
          * Removes a node's folder and every descendant folder from the expanded set.
          * @param {EffectTrayNode} collapsed - The node being collapsed.
          * @returns {void}
          */
         const collapse = (collapsed) => {
            next.delete(collapsed.folder.uuid);
            collapsed.children.forEach(collapse);
         };
         collapse(node);
      }
      else {
         next.add(node.folder.uuid);
      }

      this.expandedFolders = next;
   }

   /**
    * Collapses every folder.
    * @returns {void}
    */
   collapseAllFolders() {
      this.expandedFolders = new Set();
   }

   /**
    * Toggles the selected pack's core search mode between name-only and full-text search. The mode is
    * stored by core per collection, so the compendium's own directory shares it.
    * @returns {void}
    */
   toggleSearchMode() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack) {
         return;
      }

      pack.toggleSearchMode();
      this.searchMode = pack.searchMode;
   }

   /**
    * Toggles the selected pack's core sorting mode between alphabetical and manual, then rebuilds the
    * tree in the new order. The mode is stored by core per collection, so the compendium's own directory
    * shares it.
    * @returns {void}
    */
   toggleSortingMode() {
      /** @type {CompendiumCollection | undefined} The selected pack. */
      const pack = this.selectedPack;
      if (!pack) {
         return;
      }

      pack.toggleSortingMode();
      this.sortingMode = pack.sortingMode;
      this.#buildTree(pack);
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
         this.#hookIds.push({
            hook,
            id,
         });
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
