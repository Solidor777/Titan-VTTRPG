<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import { DICE_ICON } from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';
   import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type object Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type number Index of the Check in the item's system data. */
   export let idx = void 0;
</script>

{#if $document?.system.check[idx]}
   <div class="check">
      <!--Label-->
      <div class="label">

         <!--Name-->
         <div class="name">
            <IconLabel icon={DICE_ICON} label={$document.system.check[idx].label}/>
         </div>

         <!--Rolled Stats-->
         <div class="rolled-stats">
            {#if $document.system.check[idx].skill !== 'none'}
               {`${localize($document.system.check[idx].attribute)} (${localize($document.system.check[idx].skill)}) ${
                  $document.system.check[idx].difficulty
               }:${$document.system.check[idx].complexity}`}
            {:else}
               {`${localize($document.system.check[idx].attribute)} ${$document.system.check[idx].difficulty}:${
                  $document.system.check[idx].complexity
               }`}
            {/if}
         </div>
      </div>

      <!--Expand Button if there is anything to expand-->
      {#if $document.system.check[idx].resolveCost > 0
      || $document.system.check[idx].resistanceCheck !== 'none'
      || $document.system.check[idx].opposedCheck.enabled === true}
         <ExpandButton bind:expanded={$appState.sidebar.checks.isExpanded[idx]}/>
      {/if}

      <!--Advanced Details-->
      {#if $appState.sidebar.checks.isExpanded[idx]
      && ($document.system.check[idx].resolveCost > 0
         || $document.system.check[idx].resistanceCheck !== 'none'
         || $document.system.check[idx].opposedCheck.enabled === true)}
         <div class="advanced-details" transition:slide|local>

            <!--Resolve Cost-->
            {#if $document.system.check[idx].resolveCost > 0}
               <div class="stat" transition:slide|local>
                  <StatTag
                     label={localize('resolveCost')}
                     value={$document.system.check[idx].resolveCost}
                  />
               </div>
            {/if}

            <!--Resistance Check-->
            {#if $document.system.check[idx].resistanceCheck !== 'none'}
               <div class="labeled-stat" transition:slide|local>

                  <!--Label-->
                  <div class="stat-label">
                     {localize('resistedBy')}
                  </div>

                  <!--Value-->
                  <div class="value">
                     <ResistanceTag resistance={$document.system.check[idx].resistanceCheck}>
                        {localize($document.system.check[idx].resistanceCheck)}
                     </ResistanceTag>
                  </div>
               </div>
            {/if}

            <!--Opposed Check-->
            {#if $document.system.check[idx].opposedCheck.enabled === true}
               <div class="labeled-stat" transition:slide|local>
                  <!--Label-->
                  <div class="stat-label">
                     {localize('opposedBy')}
                  </div>

                  <!--Value-->
                  <div class="value stat">
                     <AttributeCheckTag
                        attribute={$document.system.check[idx].opposedCheck.attribute}
                        skill={$document.system.check[idx].opposedCheck.skill}
                     />
                  </div>
               </div>
            {/if}
         </div>
      {/if}
   </div>
{/if}

<div/>

<style lang="scss">
   .check {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .label {
         @include bordered-label;

         .rolled-stats {
            font-weight: normal;
         }
      }

      .advanced-details {
         @include border-bottom;
         @include flex-column;
         @include flex-group-top;
         @include padding-standard;
         @include separated-column;

         width: 100%;

         .stat {
            @include flex-row;
            @include flex-group-center;
         }

         .labeled-stat {
            @include flex-column;
            @include flex-group-top;
         }
      }
   }
</style>
