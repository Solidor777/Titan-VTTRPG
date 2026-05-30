<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import { DAMAGE_ICON, HEALING_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} SpellSheetSidebarCustomAspectProps
    * @property {number} [idx] Index of the custom aspect in the document's customAspect array.
    */

   /** @type {SpellSheetSidebarCustomAspectProps} */
   const { idx = 0 } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The custom aspect data. */
   const aspect = $derived($document.system.customAspect[idx]);
</script>

{#if aspect}
   <div class="aspect">
      <div class="aspect-label">
         <!--Damage Icon-->
         {#if aspect.isDamage}
            <i class={DAMAGE_ICON}></i>
         {/if}

         <!--Healing Icon-->
         {#if aspect.isHealing}
            <i class={HEALING_ICON}></i>
         {/if}

         {aspect.label}
      </div>

      <!--Initial Value-->
      <div class="initial-value">
         {#if aspect.initialValue}
            {aspect.initialValue}
         {/if}
         {#if aspect.scaling}
            {#if aspect.cost > 1}
               {`+ (${localize('extraSuccesses.short')} / ${aspect.cost})`}
            {:else}
               {`+ ${localize('extraSuccesses.short')}`}
            {/if}
         {/if}
      </div>

      <!--Resistance Check-->
      {#if aspect.resistanceCheck && aspect.resistanceCheck !== 'none'}
         <div class="labeled-stat" transition:slide|local>
            <!--Label-->
            <div class="label">
               {localize('resistedBy')}
            </div>

            <!--Value-->
            <div class="value">
               <ResistanceTag resistance={aspect.resistanceCheck}>
                  {localize(aspect.resistanceCheck)}
               </ResistanceTag>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .aspect {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      margin: var(--titan-spacing-standard) 0;

      .aspect-label {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;

         font-weight: bold;

         i {
            @include margin-right-standard;
         }
      }

      .labeled-stat {
         @include flex-column;
         @include flex-group-top;
         @include font-size-small;
         @include margin-top-large;

         .label {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            @include margin-top-standard;
         }
      }
   }
</style>
