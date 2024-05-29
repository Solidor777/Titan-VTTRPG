<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';

   /**
    * Object for storing tab information.
    * @typedef {object} Tab
    * @property {string} id The ID to use for the type.
    * @property {object} component The svelte component to use for the Tab.
    */

   /** @type Tab[] Array of Tab objects. */
   export let tabs = [];

   /** @type string The ID of the active Tab object. */
   export let activeTab = void 0;

   /** @type {boolean}  Whether the tabs should be bordered. */
   export let bordered = false;
</script>

<!--List of tabs-->
<div class={`tabs${bordered ? ' bordered' : ''}`}>
   <!--Tab List-->
   <div class="tab-list">
      <!--For each tab-->
      {#each tabs as tab}
         <button
            class={activeTab === tab.id ? 'active ' : ''}
            on:click={() => {
               activeTab = tab.id;
            }}
            on:mousedown={preventDefault}
         >
            {tab.label}
         </button>
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
         padding: var(--padding-standard);

         button {
            @include button;

            --button-border-radius: 5px;
            --button-line-height: var(--tab-line-height);
            --button-font-size: var(--tab-font-size);

            height: 100%;
            width: 100%;
            font-weight: normal;

            &.active {
               background: var(--highlight-background);
            }
         }
      }

      .tab-content {
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         flex: 2;
      }
   }
</style>
