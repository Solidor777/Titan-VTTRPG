<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   // List of tabs
   export let tabs = [];

   // The active tab
   export let activeTab;
</script>

<!--List of tabs-->
<div class="tabs">
   <!--Tab List-->
   <ul>
      <!--For each tab-->
      {#each tabs as tab}
         <li class={activeTab === tab.id ? "active" : ""}>
            <button
               class={activeTab === tab.id ? "active" : ""}
               on:click={() => {
                  activeTab = tab.id;
               }}
               on:mousedown={preventDefault}
            >
               {tab.label}
            </button>
         </li>
      {/each}
   </ul>

   <!--Tab Content-->
   <div class="tab-content">
      {#each tabs as tab}
         {#if tab.id === activeTab}
            <svelte:component this={tab.component} />
         {/if}
      {/each}
   </div>
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .tabs {
      @include flex-column;
      @include flex-group-top;
      @include border-normal;
      height: 100%;

      ul {
         @include flex-row;
         @include flex-space-evenly;
         @include border-bottom-normal;

         list-style: none;
         width: 100%;
         margin: 0;
         padding: 0.25rem;
      }

      li {
         @include flex-row;
         width: 100%;
         button {
            @include flex-row;
            @include flex-group-center;
            font-size: var(--font-size);
            width: 100%;
            border-style: var(--border-style);
            border-width: var(--border-width);
            border-color: var(--border-color-normal);

            &.active {
               background-color: var(--highlight-background-color);
            }
         }
      }
   }

   .tab-content {
      @include flex-column;
      position: relative;
      width: 100%;
      height: 100%;
   }
</style>
