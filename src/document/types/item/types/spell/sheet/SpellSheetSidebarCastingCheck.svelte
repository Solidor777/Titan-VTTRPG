<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import SpellSheetSidebarAspects from '~/document/types/item/types/spell/sheet/SpellSheetSidebarAspects.svelte';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   // Application statee reference
   const appState = getContext('applicationState');
   const document = getContext('document');

   /**
    * @param aspects
    */
   function areAspectsEnabled(aspects) {
      for (let idx = 0; idx < aspects.length; idx++) {
         if (aspects[idx].enabled) {
            return true;
         }
      }
      return false;
   }

   $: aspectsEnabled =
      areAspectsEnabled($document.system.aspect) ||
      $document.system.customAspect.length > 0;
</script>

<!--Casting Check-->
<div class="casting-check">
   <!--Head-->
   <div class="header {$document.system.castingCheck.attribute}">
      {#if aspectsEnabled}
         <!--Label-->
         <div class="label-button">
            {localize($document.system.castingCheck.attribute)} ({localize(
            $document.system.castingCheck.skill,
         )}) {$document.system.castingCheck.difficulty}:{$document.system
            .castingCheck.complexity}
         </div>
         <!--Expand button-->
         <div class="spacer">
            {#if $appState.isExpanded.sidebar.castingCheck}
               <!--Collapse button-->
               <IconButton
                  icon="{EXPANDED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.sidebar.castingCheck = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon="{COLLAPSED_ICON}"
                  on:click={() => {
                     $appState.isExpanded.sidebar.castingCheck = true;
                  }}
               />
            {/if}
         </div>
      {:else}
         <!--Label-->
         <div class="label-normal">
            {localize($document.system.castingCheck.attribute)} ({localize(
            $document.system.castingCheck.skill,
         )}) {$document.system.castingCheck.difficulty}:{$document.system
            .castingCheck.complexity}
         </div>
      {/if}
   </div>

   <!--Aspects-->
   {#if $appState.isExpanded.sidebar.castingCheck === true && aspectsEnabled}
      <div class="checks" transition:slide|local>
         <SpellSheetSidebarAspects/>
      </div>
   {/if}
</div>

<style lang="scss">
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
         padding: var(--padding-standard);
         font-weight: bold;
         min-height: 48px;

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
            width: 48px;
         }
      }

      .checks {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
      }
   }
</style>
