<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import { DAMAGE_ICON, HEALING_ICON } from '~/system/Icons.js';

   export let idx = 0;

   // Application statee reference
   const document = getContext('document');

   $: aspect = $document.system.customAspect[idx];
</script>

{#if aspect}
   <div class="aspect">
      <div class="aspect-label">
         <!--Damage Icon-->
         {#if aspect.isDamage}
            <i class="{DAMAGE_ICON}"/>
         {/if}

         <!--Healing Icon-->
         {#if aspect.isHealing}
            <i class="{HEALING_ICON}"/>
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
               <ResistanceTag
                  resistance={aspect.resistanceCheck}
                  label={localize(aspect.resistanceCheck)}
               />
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
      margin: var(--padding-standard) 0;

      .aspect-label {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         font-weight: bold;

         i {
            margin-right: var(--padding-standard);
         }
      }

      .labeled-stat {
         @include flex-column;
         @include flex-group-top;
         @include font-size-small;
         margin-top: var(--padding-large);

         .label {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            margin-top: var(--padding-standard);
         }
      }
   }
</style>
