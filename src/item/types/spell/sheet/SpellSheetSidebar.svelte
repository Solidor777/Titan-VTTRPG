<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ScrollingContainer from "~/helpers/svelte-components/ScrollingContainer.svelte";
   import ItemSheetSidebarChecks from "~/item/component/check/ItemSheetSidebarChecks.svelte";
   import SpellSheetSidebarAspects from "./SpellSheetSidebarAspects.svelte";
   import SpellSheetSidebarCastingCheck from "./SpellSheetSidebarCastingCheck.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.sidebar}>
      <!--Casting Check-->
      <div class="section">
         <SpellSheetSidebarCastingCheck />

         <!--Aspects-->
         {#if $document.aspect && $document.aspect.length > 0 && $appState.isExpanded.sidebar.castingCheck}
            <SpellSheetSidebarAspects />
         {/if}
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
         margin-top: 0.5rem;

         &:not(:first-child) {
            @include border-top;
         }
      }
   }
</style>
