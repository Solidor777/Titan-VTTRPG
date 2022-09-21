<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";

   // Application staore reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="sidebar">
   <!--Header-->
   <div class="header">
      {localize("attacks")}
   </div>

   <!--Attacks-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>Attacks</ScrollingContainer>
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
         @include panel-1;
         width: 100%;
         font-weight: bold;
         padding: 0.25rem 0.5rem;
      }

      .scrolling-content {
         @include panel-2;
         width: 100%;
         height: 100%;
      }
   }
</style>
