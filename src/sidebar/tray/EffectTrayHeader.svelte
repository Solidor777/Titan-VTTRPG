<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { LOCK_ICON, UNLOCK_ICON } from '~/system/Icons.js';

   /** @type {import('~/sidebar/tray/EffectTrayState.svelte.js').default} The reactive tray state from context. */
   const trayState = getContext('trayState');

   /** @type {boolean} Whether the search matches names only (true) or also indexed text (false). */
   const nameOnlySearch = $derived(trayState.searchMode === CONST.DIRECTORY_SEARCH_MODES.NAME);

   /** @type {string} The localized aria-label and tooltip for the lock/unlock toggle. */
   const lockLabel = $derived(trayState.isLocked ? localize('effectTrayUnlock') : localize('effectTrayLock'));

   /** @type {string} The localized search placeholder, worded as the core directories word theirs. */
   const searchPlaceholder = game.i18n.format('SIDEBAR.Search', { types: localize('effects') });
</script>

<!--
   Core directory header markup (`templates/sidebar/directory/header.hbs`) so the core sidebar styles apply,
   with the tray's pack row above it.
-->
<header class="directory-header flexcol">

   <!--Pack selector and lock toggle-->
   <div class="effect-tray-pack-row flexrow">
      <select
         aria-label={localize('effects')}
         data-testid="effect-tray-pack-select"
         disabled={trayState.compendiums.length === 0}
         onchange={() => trayState.selectPack(trayState.selectedPackId)}
         bind:value={trayState.selectedPackId}
      >
         {#each trayState.compendiums as pack (pack.collection)}
            <option value={pack.collection}>{pack.metadata.label}</option>
         {/each}
      </select>

      {#if trayState.isOwner}
         <button
            class="inline-control icon {trayState.isLocked ? LOCK_ICON : UNLOCK_ICON}"
            aria-label={lockLabel}
            data-testid="effect-tray-lock"
            data-tooltip=""
            onclick={() => trayState.toggleLock()}
            type="button"
         ></button>
      {/if}
   </div>

   <!--Create actions, shown only when the pack is editable, as core shows them only when creation is allowed-->
   {#if trayState.canEdit}
      <div class="header-actions action-buttons flexrow">
         <button
            class="create-entry"
            data-testid="effect-tray-new"
            onclick={() => trayState.createBlankEffect()}
            type="button"
         >
            <i
               class="fa-solid fa-wand-sparkles"
               inert
            ></i>
            <span>{localize('effectTrayNew')}</span>
         </button>

         {#if trayState.supportsFolders}
            <button
               class="create-folder"
               data-testid="effect-tray-new-folder"
               onclick={() => trayState.createFolder()}
               type="button"
            >
               <i
                  class="fa-solid fa-folder"
                  inert
               ></i>
               <span>{localize('effectTrayNewFolder')}</span>
            </button>
         {/if}
      </div>
   {/if}

   <!--Search mode, search input, sort mode, and collapse-all-->
   <search>
      <button
         class="inline-control toggle-search-mode icon {nameOnlySearch
            ? 'fa-solid fa-magnifying-glass'
            : 'fa-solid fa-file-magnifying-glass'}"
         aria-label={game.i18n.localize(nameOnlySearch ? 'SIDEBAR.SearchModeName' : 'SIDEBAR.SearchModeFull')}
         data-testid="effect-tray-search-mode"
         data-tooltip=""
         onclick={() => trayState.toggleSearchMode()}
         type="button"
      ></button>
      <input
         aria-label={searchPlaceholder}
         autocomplete="off"
         data-testid="effect-tray-search"
         name="search"
         placeholder={searchPlaceholder}
         type="search"
         bind:value={trayState.filter}
      />
      <button
         class="inline-control toggle-sort icon {trayState.sortingMode === 'a'
            ? 'fa-solid fa-arrow-down-a-z'
            : 'fa-solid fa-arrow-down-short-wide'}"
         aria-label={game.i18n.localize(trayState.sortingMode === 'a'
            ? 'SIDEBAR.SortModeAlpha'
            : 'SIDEBAR.SortModeManual')}
         data-testid="effect-tray-sort"
         data-tooltip=""
         onclick={() => trayState.toggleSortingMode()}
         type="button"
      ></button>
      <button
         class="inline-control collapse-all icon fa-duotone fa-folder-tree"
         aria-label={game.i18n.localize('FOLDER.Collapse')}
         data-testid="effect-tray-collapse-all"
         data-tooltip=""
         onclick={() => trayState.collapseAllFolders()}
         type="button"
      ></button>
   </search>
</header>

<style lang="scss">
   .effect-tray-pack-row {
      align-items: center;
      gap: 8px;
      padding-inline: 8px;

      select {
         flex: 1;
      }

      .inline-control {
         flex: none;
      }
   }
</style>
