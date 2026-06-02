import getEffectCompendiums from '~/sidebar/tray/GetEffectCompendiums.js';

/**
 * @class EffectTrayState
 * Reactive state for the Effect Tray: the available compendiums, the selected pack, its loaded
 * effect documents, the search filter, and expanded-folder tracking. Lives in Svelte context and is
 * read by every tray component. Refreshes itself when the selected pack's contents change.
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

   /** @type {Set<string>} The ids of folders currently expanded (declared now; used in Task 6). */
   expandedFolders = $state(new Set());

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
    * Registers Foundry hooks that refresh the tray when the selected pack's contents change. The
    * registration ids are stored so the listeners can be removed in `destroy()`, preventing leaks
    * when the sidebar popout path constructs a second tray state.
    * @returns {void}
    */
   #registerHooks() {
      /**
       * Refreshes the tray only when the changed effect belongs to the currently-selected pack.
       * @param {object} effect - The ActiveEffect document that changed.
       * @returns {void}
       */
      const onChange = (effect) => {
         if (effect?.pack === this.selectedPackId) {
            void this.refresh();
         }
      };

      for (const hook of ['createActiveEffect', 'updateActiveEffect', 'deleteActiveEffect']) {
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
