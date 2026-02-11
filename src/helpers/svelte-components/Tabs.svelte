<script>
   import MiniButton from '~/helpers/svelte-components/button/MiniButton.svelte';

   /**
    * Object for storing tab information.
    * @typedef {object} Tab
    * @property {string} id The ID to use for the type.
    * @property {object} component The svelte svelte-components to use for the Tab.
    */

   /** @type Tab[] Array of Tab objects. */
   export let tabs = [];

   /** @type string The ID of the active Tab object. */
   export let activeTab = void 0;

   /** @type boolean Whether the tabs should be bordered. */
   export let border = false;
</script>

<!--List of tabs-->
<div class={`tabs${border ? ' bordered' : ''}`}>
   <!--Tab List-->
   <div class="tab-list">
      <!--For each tab-->
      {#each tabs as tab}
         <div class={`button${activeTab === tab.id ? ' active' : ''}`}>
            <MiniButton on:click={() => activeTab = tab.id}>
               {tab.label}
            </MiniButton>
         </div>
      {/each}
   </div>

   <!--Tab Content-->
   <div class="tab-content">
      {#each tabs as tab}
         {#if tab.id === activeTab}
            <svelte:component this={tab.component}/>
         {/if}
      {/each}
   </div>
</div>

<style lang="scss">
   .tabs {
      @include flex-column;

      &.bordered {
         @include border;
      }

      width: 100%;
      height: 100%;

      .tab-list {
         @include flex-row;
         @include border-bottom;
         @include panel-1;

         list-style: none;
         margin: 0;
         height: 100%;
         width: 100%;
         flex: 0;

         @include padding-large;

         .button {
            width: 100%;
            height: 100%;

            &.active {
               --titan-button-background: var(--titan-highlighted-background);
            }
         }

         .tab-content {
            @include flex-column;
            @include flex-group-top;

            width: 100%;
            flex: 2;
         }
      }
   }
</style>
