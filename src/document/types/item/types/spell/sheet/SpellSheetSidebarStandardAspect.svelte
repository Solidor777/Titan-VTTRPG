<script>
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import {
      ACCURACY_ICON,
      ARMOR_ICON,
      AWARENESS_ICON,
      DAMAGE_ICON,
      DECREASE_SPEED_ICON,
      DEFENSE_ICON,
      DURATION_ICON,
      HEALING_ICON,
      INCREASE_SPEED_ICON,
      INITIATIVE_ICON,
      MELEE_ICON,
      RADIUS_ICON,
      RANGE_ICON,
   } from '~/system/Icons.js';

   // Application statee reference
   const labelIcons = {
      damage: DAMAGE_ICON,
      decreaseSpeed: DECREASE_SPEED_ICON,
      duration: DURATION_ICON,
      healing: HEALING_ICON,
      increaseSpeed: INCREASE_SPEED_ICON,
      radius: RADIUS_ICON,
      range: RANGE_ICON,
   };

   const optionIcons = {
      accuracy: ACCURACY_ICON,
      armor: ARMOR_ICON,
      awareness: AWARENESS_ICON,
      damage: DAMAGE_ICON,
      defense: DEFENSE_ICON,
      healing: HEALING_ICON,
      initiative: INITIATIVE_ICON,
      melee: MELEE_ICON,
   };

   export let aspect = void 0;
</script>

{#if aspect}
   <div class="aspect">
      <div class="label">
         <!--Icon-->
         {#if labelIcons[aspect.label]}
            <i class={labelIcons[aspect.label]}/>
         {/if}

         {localize(aspect.unit ?? aspect.label)}
      </div>

      <!--Initial Value-->
      {#if aspect.initialValue !== undefined}
         <div class="initial-value">
            <!--Scaling value-->
            {#if aspect.scaling}
               {#if aspect.initialValue}
                  {aspect.initialValue}
               {/if}
               {#if aspect.scalingCost}
                  {#if aspect.scalingCost > 1}
                     {`+ (${localize('extraSuccesses.short')} / ${
                        aspect.scalingCost
                     })`}
                  {:else}
                     {`+ ${localize('extraSuccesses.short')}`}
                  {/if}
               {:else if aspect.cost > 1}
                  {`+ (${localize('extraSuccesses.short')} / ${aspect.cost})`}
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
                  <Tag label={localize('all')}/>
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
                        <Tag label={localize(option)}/>
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
   .aspect {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      margin: var(--padding-standard) 0;

      .label {
         @include flex-row;
         @include flex-group-center;
         @include font-size-normal;
         font-weight: bold;

         i {
            margin-right: var(--padding-standard);
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
