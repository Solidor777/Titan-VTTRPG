<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import SpellSheetSidebarAspects from '~/document/types/item/types/spell/sheet/SpellSheetSidebarAspects.svelte';
   import CastingCheckTags from '~/document/svelte-components/check/CastingCheckTags.svelte';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const appState = getContext('applicationState');

   /** @type {object} Reference to the Application State store. */
   const document = getContext('document');

   /**
    * Determines whether any aspect in the supplied list is currently enabled.
    * @param {Array<{enabled: boolean}>} aspects - The spell aspects to inspect.
    * @returns {boolean} True if at least one aspect is enabled, otherwise false.
    */
   function areAspectsEnabled(aspects) {
      for (let idx = 0; idx < aspects.length; idx++) {
         if (aspects[idx].enabled) {
            return true;
         }
      }
      return false;
   }

   /** @type {boolean} True when the spell has any enabled aspect or at least one custom aspect. */
   const aspectsEnabled = $derived(
      areAspectsEnabled(document.data.system.aspect) ||
      document.data.system.customAspect.length > 0,
   );
</script>

<!--Casting Check-->
<div class="casting-check">
   <!--Head-->
   <div class="header {document.data.system.castingCheck.attribute}">
      {#if aspectsEnabled}
         <!--Casting-check tags (shared component; reads the spell's config through the document context)-->
         <div class="label-button">
            <CastingCheckTags/>
         </div>
         <!--Expand button-->
         <div class="spacer">
            {#if $appState.sidebar.castingCheck.isExpanded}
               <!--Collapse button-->
               <IconButton
                  icon={EXPANDED_ICON}
                  label={localize('collapse')}
                  onclick={() => {
                     $appState.sidebar.castingCheck.isExpanded = false;
                  }}
               />
            {:else}
               <!--Expand button-->
               <IconButton
                  icon={COLLAPSED_ICON}
                  label={localize('expand')}
                  onclick={() => {
                     $appState.sidebar.castingCheck.isExpanded = true;
                  }}
               />
            {/if}
         </div>
      {:else}
         <!--Casting-check tags (shared component; reads the spell's config through the document context)-->
         <div class="label-normal">
            <CastingCheckTags/>
         </div>
      {/if}
   </div>

   <!--Aspects-->
   {#if $appState.sidebar.castingCheck.isExpanded === true && aspectsEnabled}
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
         @include tag;

         width: 100%;

         @include padding-standard;

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
