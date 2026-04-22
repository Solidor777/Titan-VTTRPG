<script>
   import { getContext } from 'svelte';

   /** @type {object | undefined} The Header component for the sheet. */
   export let header = void 0;

   /** @type {object | undefined} The Sidebar component for the sheet. */
   export let sidebar = void 0;

   /** @type {object | undefined} The Tabs component for the sheet. */
   export let tabs = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>
{#if $document}
   <!--Sheet-->
   <div class="titan-sheet">
      <!--Header-->
      <div class="header">
         <svelte:component this={header}/>
      </div>

      <!--Sheet body-->
      <div class="body">

         <!--Sidebar-->
         <div class="sidebar">
            <svelte:component this={sidebar}/>
         </div>

         <!--Tabs-->
         <div class="tabs">
            <svelte:component this={tabs}/>
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

         .sidebar {
            @include panel-1;
         }

         .tabs {
            @include panel-1;
            @include margin-left-large;

            width: 100%;
         }
      }
   }
</style>
