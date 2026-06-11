<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';
   import SpellSheetSidebarAspects from '~/document/types/item/types/spell/sheet/SpellSheetSidebarAspects.svelte';
   import CastingCheckTags from '~/document/svelte-components/check/CastingCheckTags.svelte';

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
         <!--Expand button (shared component, matching the item-check sidebar)-->
         <div class="spacer">
            <ExpandButton bind:expanded={$appState.sidebar.castingCheck.isExpanded}/>
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
         @include attribute-colors;
         @include padding-standard;

         width: 100%;
         align-items: center;
         font-size: var(--titan-tag-font-size);
         font-weight: bold;
         min-height: 48px;

         .label-normal {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            flex-wrap: wrap;
            align-items: center;
         }

         .label-button {
            @include flex-row;
            @include flex-group-right;

            width: 100%;
            flex-wrap: wrap;
            align-items: center;
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
