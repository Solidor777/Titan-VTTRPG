<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import EffectTrayRow from '~/sidebar/tray/EffectTrayRow.svelte';
   import filterEffectTree from '~/sidebar/tray/FilterEffectTree.js';

   /**
    * @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from
    *    context.
    */
   const trayState = getContext('trayState');

   /** @type {string | null} The uuid of the folder currently being renamed inline, or null when none. */
   let renamingFolderUuid = $state(null);

   /** @type {string} The working value of the inline folder-rename input. */
   let folderRenameValue = $state('');

   /** @type {boolean} Whether the current folder rename is being cancelled, so the blur commit is skipped. */
   let isCancellingFolderRename = false;

   /** @type {string} The search text with surrounding whitespace and diacritics removed, as core cleans it. */
   const query = $derived(foundry.applications.ux.SearchFilter.cleanQuery(trayState.filter));

   /**
    * @type {import('~/sidebar/tray/FilterEffectTree.js').FilteredEffectTree | null} The tree pruned to the
    * search, or null when there is no search.
    */
   const searchView = $derived.by(() => {
      if (!query) {
         return null;
      }

      /** @type {RegExp} The case-insensitive pattern core directories test names against. */
      const pattern = new RegExp(RegExp.escape(query), 'i');

      /**
       * @type {Set<string> | null} The ids core's full-text search matches (name and indexed text
       * fields), or null in name-only mode.
       */
      const fullTextIds = trayState.searchMode === CONST.DIRECTORY_SEARCH_MODES.FULL
         ? new Set(trayState.selectedPack?.search({ query }).map((entry) => entry._id))
         : null;

      /**
       * Tests a document name against the search pattern after core's query cleaning.
       * @param {string} name - The document name.
       * @returns {boolean} True when the name matches.
       */
      const nameMatches = (name) => pattern.test(foundry.applications.ux.SearchFilter.cleanQuery(name));

      return filterEffectTree(
         trayState.tree,
         (folder) => nameMatches(folder.name),
         (effect) => fullTextIds ? fullTextIds.has(effect.id) : nameMatches(effect.name),
      );
   });

   /** @type {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayTree} The tree to display. */
   const displayed = $derived(searchView?.tree ?? trayState.tree);

   /** @type {boolean} Whether there is nothing to display. */
   const isEmpty = $derived(displayed.children.length === 0 && displayed.effects.length === 0);

   /**
    * Whether a folder is shown expanded: expanded by the user, or holding a search match.
    * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayNode} node - The folder node.
    * @returns {boolean} True when the folder's contents are shown.
    */
   function isExpanded(node) {
      return trayState.expandedFolders.has(node.folder.uuid) || !!searchView?.autoExpand.has(node.folder.uuid);
   }

   /**
    * Handles a click on a folder header: toggles the folder unless the click came from a header control.
    * @param {MouseEvent} event - The click on the header or one of its controls.
    * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayNode} node - The clicked folder.
    * @returns {void}
    */
   function onFolderHeaderClick(event, node) {
      if (event.target.closest('button, input')) {
         return;
      }

      trayState.toggleFolder(node);
   }

   /**
    * Handles keydown on a folder header: Enter or Space toggles the folder.
    * @param {KeyboardEvent} event - The key pressed while the header has focus.
    * @param {import('~/sidebar/tray/EffectTrayState.svelte.js').EffectTrayNode} node - The focused folder.
    * @returns {void}
    */
   function onFolderHeaderKeydown(event, node) {
      if (event.target !== event.currentTarget) {
         return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
         event.preventDefault();
         trayState.toggleFolder(node);
      }
   }

   /**
    * Svelte action: begins inline rename of a folder when its header receives the `titan-folder-rename`
    * event the folder context menu dispatches.
    * @param {HTMLElement} header - The folder header element.
    * @param {Folder} folder - The folder the header belongs to.
    * @returns {{ update: (next: Folder) => void, destroy: () => void }} The action lifecycle handle.
    */
   function renameOnEvent(header, folder) {
      /** @type {Folder} The folder the header currently shows. */
      let current = folder;

      /**
       * Starts the inline rename in response to the context menu's rename event.
       * @returns {void}
       */
      const handler = () => beginFolderRename(current);
      header.addEventListener('titan-folder-rename', handler);
      return {
         update(next) {
            current = next;
         },
         destroy() {
            header.removeEventListener('titan-folder-rename', handler);
         },
      };
   }

   /**
    * Enters inline-rename mode for a folder, seeding the input with the folder's current name. No-ops
    * when the current user cannot edit the selected pack.
    * @param {Folder} folder - The folder to begin renaming.
    * @returns {void}
    */
   function beginFolderRename(folder) {
      if (!trayState.canEdit) {
         return;
      }

      folderRenameValue = folder.name;
      renamingFolderUuid = folder.uuid;
   }

   /**
    * Commits the inline folder rename, persisting the new name through the tray state, then reverts
    * to the static name display. When the rename was cancelled via Escape, clears the cancelling flag
    * and returns early without persisting.
    * @param {Folder} folder - The folder being renamed.
    * @returns {Promise<void>}
    */
   async function commitFolderRename(folder) {
      if (isCancellingFolderRename) {
         isCancellingFolderRename = false;
         return;
      }

      renamingFolderUuid = null;
      await trayState.renameFolder(folder, folderRenameValue.trim());
   }

   /**
    * Handles keydown within the folder-rename input: Enter commits, Escape cancels.
    * @param {KeyboardEvent} event - The keydown event.
    * @param {Folder} folder - The folder being renamed.
    * @returns {void}
    */
   function onFolderRenameKeydown(event, folder) {
      if (event.key === 'Enter') {
         event.preventDefault();
         void commitFolderRename(folder);
      }
      else if (event.key === 'Escape') {
         event.preventDefault();
         isCancellingFolderRename = true;
         renamingFolderUuid = null;
      }
   }

   /**
    * Reads the dragged effect's uuid from a drop event's transfer.
    * @param {DragEvent} event - The drop event.
    * @returns {string | undefined} The dragged effect uuid, or undefined when absent or malformed.
    */
   function readDraggedUuid(event) {
      /** @type {string} The raw drag-data payload. */
      const raw = event.dataTransfer?.getData('text/plain');
      if (!raw) {
         return void 0;
      }

      try {
         /** @type {object} The parsed Foundry drag data. */
         const dragData = JSON.parse(raw);
         return dragData?.type === 'ActiveEffect' ? dragData.uuid : void 0;
      }
      catch {
         return void 0;
      }
   }

   /**
    * Moves a dropped effect into the given folder (or to the pack root when folderId is null), but
    * only when the dragged effect already belongs to the selected pack. Cross-pack drops fall
    * through to the tray's stash handler instead.
    * @param {DragEvent} event - The drop event.
    * @param {string | null} folderId - The destination folder id, or null for the pack root.
    * @returns {void}
    */
   function onFolderDrop(event, folderId) {
      /** @type {string | undefined} The dragged effect uuid. */
      const uuid = readDraggedUuid(event);
      if (!uuid) {
         return;
      }

      /** @type {object | undefined} The pack effect matching the dragged uuid. */
      const effect = trayState.effects.find((candidate) => candidate.uuid === uuid);
      if (!effect) {
         return;
      }

      // Intercept the drop so enclosing folders and the tray's stash handler do not also handle it.
      event.preventDefault();
      event.stopPropagation();
      void trayState.moveEffectToFolder(effect, folderId);
   }
</script>

{#snippet folderItem(node)}
   {@const expanded = isExpanded(node)}
   {@const color = node.folder.color?.css}
   <li
      class="directory-item folder flexcol"
      class:expanded
      data-folder-depth={node.depth}
      data-folder-id={node.folder.id}
      data-testid="effect-tray-folder"
      data-uuid={node.folder.uuid}
      ondragover={(event) => event.preventDefault()}
      ondrop={(event) => onFolderDrop(event, node.folder.id)}
   >
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <header
         class="folder-header"
         aria-expanded={expanded}
         data-testid="effect-tray-folder-header"
         onclick={(event) => onFolderHeaderClick(event, node)}
         onkeydown={(event) => onFolderHeaderKeydown(event, node)}
         role="button"
         style:background-color={color}
         tabindex="0"
         use:renameOnEvent={node.folder}
      >
         <i
            class="fa-solid fa-folder-open fa-fw"
            inert
         ></i>

         {#if renamingFolderUuid === node.folder.uuid}
            <input
               class="folder-name"
               data-testid="effect-tray-folder-rename"
               type="text"
               use:focusOnMount
               onblur={() => void commitFolderRename(node.folder)}
               onkeydown={(event) => onFolderRenameKeydown(event, node.folder)}
               bind:value={folderRenameValue}
            />
         {:else}
            <span class="folder-name ellipsis">{node.folder.name}</span>
         {/if}

         {#if trayState.canEdit && node.depth < CONST.FOLDER_MAX_DEPTH}
            <button
               class="create-button create-folder icon icon-plus fa-solid fa-folder"
               aria-label={game.i18n.localize('SIDEBAR.ACTIONS.CREATE.Folder')}
               data-testid="effect-tray-folder-create-folder"
               data-tooltip=""
               onclick={() => trayState.createFolder(node.folder)}
               type="button"
            ></button>
         {/if}

         {#if trayState.canEdit}
            <button
               class="create-button create-entry icon icon-plus fa-solid fa-wand-sparkles"
               aria-label={localize('effectTrayNew')}
               data-testid="effect-tray-folder-create-effect"
               data-tooltip=""
               onclick={() => trayState.createBlankEffect(node.folder.id)}
               type="button"
            ></button>
         {/if}
      </header>

      <ol
         class="subdirectory plain"
         style:border-left-color={color}
      >
         {#if expanded}
            {#each node.children as child (child.folder.id)}
               {@render folderItem(child)}
            {/each}
            {#each node.effects as effect (effect.id)}
               <EffectTrayRow {effect} />
            {/each}
         {/if}
      </ol>
   </li>
{/snippet}

{#if trayState.compendiums.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-no-packs"
   >
      {localize('effectTrayNoPacks')}
   </p>
{:else if isEmpty}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-empty"
   >
      {localize('effectTrayEmpty')}
   </p>
{:else}
   <ol
      class="directory-list plain"
      data-testid="effect-tray-list"
      ondragover={(event) => event.preventDefault()}
      ondrop={(event) => onFolderDrop(event, null)}
   >
      {#each displayed.children as node (node.folder.id)}
         {@render folderItem(node)}
      {/each}
      {#each displayed.effects as effect (effect.id)}
         <EffectTrayRow {effect} />
      {/each}
   </ol>
{/if}

<style lang="scss">
   .effect-tray-empty {
      @include padding-standard;

      width: 100%;
      text-align: center;
      opacity: 0.75;
   }

   .folder-header input.folder-name {
      flex: 1;
      height: var(--sidebar-folder-height);
   }
</style>
