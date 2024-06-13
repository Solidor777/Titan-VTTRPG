<script>
   // Header, sidebar, and tabs to allow this layout to be used by multiple item types
   import {getContext} from 'svelte';

   export let header = void 0;
   export let sidebar = void 0;
   export let tabs = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>
{#if $document}
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
      @include font-size-normal;

      .body {
         @include flex-row;

         height: 100%;
         width: 100%;

         .sidebar {
            margin: var(--titan-padding-large) var(--titan-padding-large) 0 0;
         }

         .tabs {
            width: 100%;
            margin-top: var(--titan-padding-large);
         }
      }
   }
</style>
