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
         button {
            @include border-normal;
            font-size: var(--font-size);

            &.active {
               background-color: var(--color-background-highlight);
            }
         }
      }
   }

   .tab-content {
      width: 100%;
      height: 100%;
   }
</style>
