<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';

   // Application statee reference
   const document = getContext('DocumentStore');
   const labelIcons = {
      damage: 'fas fa-burst',
      healing: 'fas fa-heart',
      range: 'fas fa-ruler',
      radius: 'fas fa-bullseye',
      duration: 'fas fa-clock',
      decreaseSpeed: 'fas fa-person-running',
      increaseSpeed: 'fas fa-person-running',
   };

   const optionIcons = {
      awareness: 'fas fa-eye',
      defense: 'fas fa-shield',
      melee: 'fas fa-sword',
      accuracy: 'fas fa-bow-arrow',
      initiative: 'fas fa-clock',
      armor: 'fas fa-helmet-battle',
      damage: 'fas fa-burst',
      healing: 'fas fa-heart',
   };

   export let aspect = void 0;
</script>

{#if aspect}
   <div class="aspect">
      <div class="label">
         <!--Icon-->
         {#if labelIcons[aspect.label]}
            <i class={labelIcons[aspect.label]} />
         {/if}

         {localize(aspect.units ?? aspect.label)}
      </div>

      <!--Initial Value-->
      {#if aspect.initialValue !== undefined}
         <div class="initial-value">
            <!--Scaling value-->
            {#if aspect.scaling}
               {#if aspect.initialValue}
                  {aspect.initialValue}
               {/if}
               {#if aspect.cost > 1}
                  {`+ (${aspect.cost} / ${localize('extraSuccesses.short')})`}
               {:else}
                  {`+ ${localize('extraSuccesses.short')}`}
               {/if}
            {:else}
               <!--Non scaling value-->
               {#if typeof aspect.initialValue === 'string'}
                  {localize(aspect.initialValue)}
               {:else}
                  {aspect.initialValue}
               {/if}
            {/if}
         </div>
      {/if}

      <!--Options-->
      {#if aspect.option}
         <div class="options">
            {#if aspect.allOptions}
               <!--All Options-->
               <div class="option">
                  <Tag label={localize('all')} />
               </div>
            {:else}
               {#each aspect.option as option}
                  <!--Each option-->
                  <div class="option">
                     {#if optionIcons[option]}
                        <IconTag
                           label={localize(option)}
                           icon={optionIcons[option]}
                        />
                     {:else if aspect.label === 'decreaseAttribute' || aspect.label === 'increaseAttribute'}
                        <AttributeTag
                           label={localize(option)}
                           attribute={option}
                        />
                     {:else if aspect.label === 'decreaseResistance' || aspect.label === 'increaseResistance'}
                        <ResistanceTag
                           label={localize(option)}
                           resistance={option}
                        />
                     {:else}
                        <Tag label={localize(option)} />
                     {/if}
                  </div>
               {/each}
            {/if}
         </div>
      {/if}

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
   @import '../../../../Styles/Mixins.scss';

   .aspect {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      margin: 0.25rem 0;

      .label {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         font-weight: bold;

         i {
            margin-right: 0.25rem;
         }
      }

      .options {
         @include flex-row;
         @include flex-group-center;
         flex-wrap: wrap;
         width: 100%;

         .option {
            @include tag-margin;
            @include font-size-small;
         }
      }

      .labeled-stat {
         @include flex-column;
         @include flex-group-top;
         @include font-size-small;
         margin-top: 0.5rem;

         .label {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            margin-top: 0.25rem;
         }
      }
   }
</style>
