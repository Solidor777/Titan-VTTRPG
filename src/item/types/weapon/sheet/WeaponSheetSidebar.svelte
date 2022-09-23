<script>
   import { getContext } from "svelte";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import WeaponSheetSidebarAttacks from "./WeaponSheetSidebarAttacks.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
</script>

<div class="sidebar">
   <!--Attacks-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
         <WeaponSheetSidebarAttacks />
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

      .scrolling-content {
         @include panel-2;
         width: 100%;
         height: 100%;
      }
   }
</style>
