<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import focusOnMount from '~/helpers/svelte-actions/FocusOnMount.js';
   import EffectTrayRow from '~/sidebar/tray/EffectTrayRow.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { COLLAPSED_ICON, DELETE_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /**
    * @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from
    *    context.
    */
   const trayState = getContext('trayState');

   /** @type {string | null} The id of the folder currently being renamed inline, or null when none. */
   let renamingFolderId = $state(null);

   /** @type {string} The working value of the inline folder-rename input. */
   let folderRenameValue = $state('');

   /** @type {boolean} Whether the current folder rename is being cancelled, so the blur commit is skipped. */
   let isCancellingFolderRename = false;

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
      renamingFolderId = folder.id;
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

      renamingFolderId = null;
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
         renamingFolderId = null;
      }
   }

   /**
    * Handles keydown on the static folder name: Enter or F2 begins inline rename, mirroring the
    * double-click affordance for keyboard users.
    * @param {KeyboardEvent} event - The keydown event.
    * @param {Folder} folder - The folder to begin renaming.
    * @returns {void}
    */
   function onFolderNameKeydown(event, folder) {
      if (event.key === 'Enter' || event.key === 'F2') {
         event.preventDefault();
         beginFolderRename(folder);
      }
   }

   // The lowercased search term, computed once per filter change rather than per element.
   /** @type {string} The lowercased search filter text. */
   const search = $derived(trayState.filter.toLowerCase());

   // The effects of the selected pack, filtered by the search text and sorted by name.
   /** @type {object[]} The filtered, sorted effects to display. */
   const filtered = $derived(
      trayState.effects
         .filter((effect) => effect.name.toLowerCase().includes(search))
         .sort((a, b) => a.name.localeCompare(b.name)),
   );

   // Whether the selected pack supports folders (only compendium packs expose a folders collection).
   /** @type {boolean} Whether folder grouping applies to the selected pack. */
   const hasFolders = $derived(trayState.folders.length > 0);

   // The folders of the selected pack sorted by name, each paired with its matching filtered effects.
   /** @type {{ folder: Folder, effects: object[] }[]} The folder groups in display order. */
   const folderGroups = $derived(
      [...trayState.folders]
         .sort((a, b) => a.name.localeCompare(b.name))
         .map((folder) => ({
            folder,
            effects: filtered.filter((effect) => effect.folder?.id === folder.id),
         })),
   );

   // The filtered effects that are not inside any folder, rendered at the pack root.
   /** @type {object[]} The root-level (folderless) effects. */
   const rootEffects = $derived(filtered.filter((effect) => !effect.folder));

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

      // Intercept the drop so the tray's stash handler does not also fire for an in-pack move.
      event.preventDefault();
      event.stopPropagation();
      void trayState.moveEffectToFolder(effect, folderId);
   }
</script>

{#if trayState.compendiums.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-no-packs"
   >
      {localize('effectTrayNoPacks')}
   </p>
{:else if hasFolders}
   <div
      class="effect-tray-folders"
      data-testid="effect-tray-list"
   >
      {#each folderGroups as group (group.folder.id)}
         {@const expanded = trayState.expandedFolders.has(group.folder.id)}
         <section
            class="effect-tray-folder"
            data-folder-id={group.folder.id}
            ondragover={(event) => event.preventDefault()}
            ondrop={(event) => onFolderDrop(event, group.folder.id)}
            role="group"
         >
            <header
               class="effect-tray-folder-header"
               data-testid="effect-tray-folder"
               ondragover={(event) => event.preventDefault()}
               ondrop={(event) => onFolderDrop(event, group.folder.id)}
               role="group"
            >
               <IconButton
                  icon={expanded ? EXPANDED_ICON : COLLAPSED_ICON}
                  label={group.folder.name}
                  onclick={() => trayState.toggleFolder(group.folder.id)}
                  testId="effect-tray-folder-toggle"
                  tooltip={group.folder.name}
               />

               <!--Folder name (double-click to rename when editable)-->
               {#if renamingFolderId === group.folder.id}
                  <input
                     class="effect-tray-folder-rename"
                     data-testid="effect-tray-folder-rename"
                     type="text"
                     use:focusOnMount
                     onblur={() => void commitFolderRename(group.folder)}
                     onkeydown={(event) => onFolderRenameKeydown(event, group.folder)}
                     bind:value={folderRenameValue}
                  />
               {:else}
                  <span
                     class="effect-tray-folder-name"
                     role="button"
                     tabindex={trayState.canEdit ? 0 : -1}
                     ondblclick={() => beginFolderRename(group.folder)}
                     onkeydown={(event) => onFolderNameKeydown(event, group.folder)}
                  >
                     {group.folder.name}
                  </span>
               {/if}
               <span class="effect-tray-folder-count">{group.effects.length}</span>

               {#if trayState.canEdit}
                  <IconButton
                     icon={DELETE_ICON}
                     label={localize('effectTrayDeleteFolder')}
                     onclick={() => trayState.deleteFolder(group.folder)}
                     testId="effect-tray-folder-delete"
                     tooltip={localize('effectTrayDeleteFolder')}
                  />
               {/if}
            </header>

            {#if expanded && group.effects.length > 0}
               <ol class="effect-tray-list">
                  {#each group.effects as effect (effect.id)}
                     <li>
                        <EffectTrayRow {effect} />
                     </li>
                  {/each}
               </ol>
            {/if}
         </section>
      {/each}

      <!--Root drop zone and folderless effects-->
      <section
         class="effect-tray-folder effect-tray-root"
         ondragover={(event) => event.preventDefault()}
         ondrop={(event) => onFolderDrop(event, null)}
         role="group"
      >
         {#if rootEffects.length > 0}
            <ol class="effect-tray-list">
               {#each rootEffects as effect (effect.id)}
                  <li>
                     <EffectTrayRow {effect} />
                  </li>
               {/each}
            </ol>
         {/if}
      </section>

      {#if filtered.length === 0}
         <p
            class="effect-tray-empty"
            data-testid="effect-tray-empty"
         >
            {localize('effectTrayEmpty')}
         </p>
      {/if}
   </div>
{:else if filtered.length === 0}
   <p
      class="effect-tray-empty"
      data-testid="effect-tray-empty"
   >
      {localize('effectTrayEmpty')}
   </p>
{:else}
   <ol
      class="effect-tray-list"
      data-testid="effect-tray-list"
   >
      {#each filtered as effect (effect.id)}
         <li>
            <EffectTrayRow {effect} />
         </li>
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

   .effect-tray-folders {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      overflow-y: auto;

      .effect-tray-folder {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         .effect-tray-folder-header {
            @include flex-row;
            @include flex-group-left;
            @include padding-standard;

            width: 100%;

            .effect-tray-folder-name {
               @include margin-left-standard;

               overflow: hidden;
               text-overflow: ellipsis;
               white-space: nowrap;
            }

            .effect-tray-folder-rename {
               @include input;
               @include margin-left-standard;

               flex: 1;
            }

            .effect-tray-folder-count {
               @include margin-left-standard;

               opacity: 0.75;
            }
         }
      }
   }

   .effect-tray-list {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;
      overflow-y: auto;
      list-style: none;

      li {
         @include flex-row;
         @include flex-space-between;

         width: 100%;

         &:not(:first-child) {
            @include margin-top-standard;
         }
      }
   }
</style>
