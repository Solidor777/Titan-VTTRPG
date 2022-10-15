<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import { slide } from "svelte/transition";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
   import SpellSheetSidebarAspects from "./SpellSheetSidebarAspects.svelte";

   // Application statee reference
   const appState = getContext("ApplicationStateStore");
   const document = getContext("DocumentStore");
</script>

<!--Casting Check-->
<div class="casting-check">
   <!--Head-->
   <div class="header {$document.system.castingCheck.attribute}">
      {#if $document.system.aspect.length > 0 || $document.system.customAspect.length}
         <!--Label-->
         <div class="label-button">
            {localize($document.system.castingCheck.attribute)} ({localize($document.system.castingCheck.skill)}) {$document
               .system.castingCheck.difficulty}:{$document.system.castingCheck.complexity}
         </div>
         <!--Expand button-->
         <div class="spacer">
            {#if $appState.isExpanded.sidebar.castingCheck}
               <!--Collapse button-->
               <IconButton
                  icon="fas fa-angle-double-down"
                  on:click={() => {
                     $appState.isExpanded.sidebar.castingCheck = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="fas fa-angle-double-left"
                  on:click={() => {
                     $appState.isExpanded.sidebar.castingCheck = true;
                  }}
               />
            {/if}
         </div>
      {:else}
         <!--Label-->
         <div class="label-normal">
            {localize($document.system.castingCheck.attribute)} ({localize($document.system.castingCheck.skill)}) {$document
               .system.castingCheck.difficulty}:{$document.system.castingCheck.complexity}
         </div>
      {/if}
   </div>

   <!--Aspects-->
   {#if $appState.isExpanded.sidebar.castingCheck === true && ($document.system.aspect.length > 0 || $document.system.customAspect.length)}
      <div class="checks" transition:slide|local>
         <SpellSheetSidebarAspects />
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../../Styles/Mixins.scss";
   .casting-check {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-group-center;
         @include border-top-bottom;
         @include attribute-colors;
         @include label;
         width: 100%;
         padding: 0.25rem;
         font-weight: bold;
         min-height: 3rem;

         .label-normal {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            flex-wrap: wrap;
         }

         .label-button {
            @include flex-row;
            @include flex-group-right;
            width: 100%;
            flex-wrap: wrap;
         }

         .spacer {
            @include flex-row;
            @include flex-group-right;
            width: 3rem;
         }
      }

      .checks {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
      }
   }
</style>
