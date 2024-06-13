<script>
   import CharacterSheetTabs from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabs.svelte';
   import CharacterSheetSidebar
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSidebar.svelte';
   import {getContext} from 'svelte';

   // Header to allow this sheet to be used with players or NPCs
   export let header = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>
{#if $document}
   <!--Sheet-->
   <div class="titan-sheet">
      <!--Sidebar-->
      <div class="sidebar">
         <CharacterSheetSidebar/>
      </div>

      <!--Sheet Body-->
      <div class="body">
         <!--Header -->
         <div class="header">
            <svelte:component this={header}/>
         </div>

         <!--Tab Content-->
         <div class="tabs">
            <CharacterSheetTabs/>
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   .titan-sheet {
      @include flex-row;
      @include font-size-normal;

      .sidebar {
         margin-right: var(--titan-padding-large);
      }

      .body {
         @include flex-column;

         flex-grow: 1;

         .tabs {
            margin-top: var(--titan-padding-large);
            flex-grow: 1;
         }
      }
   }
</style>
