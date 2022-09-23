<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetSidebarChecks from "../../../component/check/ItemSheetSidebarChecks.svelte";
   import WeaponSheetSidebarAttacks from "./WeaponSheetSidebarAttacks.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <!--Attacks-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Attacks-->
      <div class="attacks">
         <WeaponSheetSidebarAttacks />
      </div>

      <!--Checks-->
      {#if $document.system.check.length > 0}
         <div class="checks" transition:slide|local>
            <ItemSheetSidebarChecks />
         </div>
      {/if}
   </ScrollingContainer>
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";

   .sidebar {
      @include flex-column;
      @include flex-group-top;
      @include border;
      @include panel-2;
      width: 100%;
      height: 100%;

      .checks {
         @include border-top;
         margin-top: 0.25rem;
      }
   }
</style>
