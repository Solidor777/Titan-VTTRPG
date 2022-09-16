<script>
   import { getContext } from "svelte";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetChecksSidebar from "~/item/sheet/ItemSheetChecksSidebar.svelte";

   // Application staore reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="sidebar">
   <div class="header">
      {localize("LOCAL.checks.label")}
   </div>
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
         <ItemSheetChecksSidebar />
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      width: 100%;
      box-sizing: border-box;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include border-bottom;
         width: 100%;
         font-weight: bold;
         margin-top: 0.5rem;
         padding-bottom: 0.5rem;
      }

      .scrolling-content {
         width: 100%;
         height: 100%;
      }
   }
</style>
