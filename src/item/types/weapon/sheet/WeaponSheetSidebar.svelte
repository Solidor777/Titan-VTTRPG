<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import WeaponSheetSidebarAttacks from "./WeaponSheetSidebarAttacks.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="sidebar">
   <!--Attacks-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
         <div class="attacks">
            <!--Header-->
            <div class="header">
               {localize("attacks")}
            </div>

            <div class="list">
               <WeaponSheetSidebarAttacks />
            </div>
         </div>
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
         @include panel-1;
         width: 100%;
         font-weight: bold;
         padding: 0.25rem 0.5rem;
         font-size: 1.2rem;
      }

      .scrolling-content {
         @include panel-2;
         width: 100%;
         height: 100%;
      }
   }
</style>
