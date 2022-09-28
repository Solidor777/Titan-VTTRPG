<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetSidebarChecks from "~/item/component/check/ItemSheetSidebarChecks.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <div class="section header" transition:slide|local>
         {localize("checks")}
      </div>

      <!--Checks-->
      {#if $document.system.check.length > 0}
         <div class="section" transition:slide|local>
            <ItemSheetSidebarChecks />
         </div>
      {/if}
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";
   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-2;
      width: 100%;
      height: 100%;

      .section {
         @include flex-column;
         @include flex-group-top;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.5rem;
         }
      }

      .header {
         @include panel-1;
         @include border-bottom;
         padding: 0.5rem 0;
         font-weight: bold;
      }
   }
</style>
