<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetSidebarChecks from "~/item/component/check/ItemSheetSidebarChecks.svelte";
   import ItemSheetSidebarTraits from "~/item/sheet/ItemSheetSidebarTraits.svelte";
   import WeaponSheetSidebarAttacks from "./WeaponSheetSidebarAttacks.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <!--Attacks-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Custom Traits-->
      <div class="section">
         <ItemSheetSidebarTraits />
      </div>

      <!--Attacks-->
      <div class="section">
         <WeaponSheetSidebarAttacks />
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
   @import "../../../../Styles/Mixins.scss";

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
   }
</style>
