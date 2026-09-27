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
   // The sheet fills the window content (a flex column) and never grows past it: when the window is clamped
   // shorter than the sheet's natural height (a zoomed-in or short viewport), the sidebar and the tab lists
   // scroll instead of being clipped by the window.
   .titan-sheet {
      @include flex-row;

      flex: 1 1 auto;
      min-height: 0;

      // Rounded and clipped so square children cannot poke past the panel corners.
      .header {
         @include panel-1;

         border-radius: var(--titan-border-radius);
         overflow: hidden;
      }

      // Clipping zeroes the automatic flex minimum, so the fixed-width sidebar must not shrink. It scrolls
      // vertically when the window is shorter than its content; any non-visible overflow still clips the
      // children to the rounded corners.
      .sidebar {
         @include panel-1;
         @include margin-right-large;

         border-radius: var(--titan-border-radius);
         flex: 0 0 auto;
         overflow: hidden auto;
      }

      // The body stays unfilled so the gap between the header and tab panels shows the sheet
      // background.
      .body {
         @include flex-column;

         flex-grow: 1;
         min-height: 0;

         .tabs {
            @include margin-top-large;

            flex-grow: 1;
            min-height: 0;
         }
      }
   }
</style>
