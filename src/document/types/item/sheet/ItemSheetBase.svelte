<script>
   import { getContext } from 'svelte';

   /**
    * @typedef {object} ItemSheetBaseProps
    * @property {object | undefined} [header] The Header component for the sheet.
    * @property {object | undefined} [sidebar] The Sidebar component for the sheet.
    * @property {object | undefined} [tabs] The Tabs component for the sheet.
    */

   /** @type {ItemSheetBaseProps} */
   const { header = undefined, sidebar = undefined, tabs = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>
{#if document.data}
   <!--Sheet-->
   <div class="titan-sheet">
      <!--Header-->
      <div class="header">
         {#if header}
            {#each [header] as Header}
               <Header/>
            {/each}
         {/if}
      </div>

      <!--Sheet body-->
      <div class="body">

         <!--Sidebar-->
         <div class="sidebar">
            {#if sidebar}
               {#each [sidebar] as Sidebar}
                  <Sidebar/>
               {/each}
            {/if}
         </div>

         <!--Tabs-->
         <div class="tabs">
            {#if tabs}
               {#each [tabs] as TabsComp}
                  <TabsComp/>
               {/each}
            {/if}
         </div>
      </div>
   </div>
{/if}

<style lang="scss">
   .titan-sheet {
      @include flex-column;

      height: 100%;

      .body {
         @include flex-row;

         height: 100%;
         width: 100%;

         @include margin-top-large;

         // Rounded and clipped so square children cannot poke past the panel corners. Clipping
         // zeroes the automatic flex minimum, so the fixed-width sidebar must not shrink.
         .sidebar {
            @include panel-1;

            border-radius: var(--titan-border-radius);
            flex: 0 0 auto;
            overflow: hidden;
         }

         .tabs {
            @include panel-1;
            @include margin-left-large;

            border-radius: var(--titan-border-radius);
            overflow: hidden;
            width: 100%;
         }
      }
   }
</style>
