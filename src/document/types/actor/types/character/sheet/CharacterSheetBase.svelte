<script>
   import CharacterSheetTabs from '~/document/types/actor/types/character/sheet/tabs/CharacterSheetTabs.svelte';
   import CharacterSheetSidebar
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSidebar.svelte';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetBaseProps
    * @property {object | undefined} [header] Header Component for the sheet.
    */

   /** @type {CharacterSheetBaseProps} */
   const { header = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>
{#if document.data}
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
            {#if header}
               {#each [header] as Header}
                  <Header/>
               {/each}
            {/if}
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

      // Rounded and clipped so square children cannot poke past the panel corners.
      .header {
         @include panel-1;

         border-radius: var(--titan-border-radius);
         overflow: hidden;
      }

      .sidebar {
         @include panel-1;
         @include margin-right-large;

         border-radius: var(--titan-border-radius);
         overflow: hidden;
      }

      // The body stays unfilled so the gap between the header and tab panels shows the sheet
      // background.
      .body {
         @include flex-column;

         flex-grow: 1;

         .tabs {
            @include margin-top-large;

            flex-grow: 1;
         }
      }
   }
</style>
