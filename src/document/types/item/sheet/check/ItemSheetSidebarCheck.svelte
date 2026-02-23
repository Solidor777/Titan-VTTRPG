<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { slide } from 'svelte/transition';
   import ResistanceTag from '~/helpers/svelte-components/tag/ResistanceTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { COLLAPSED_ICON, DICE_ICON, EXPANDED_ICON } from '~/system/Icons.js';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';
   import IconLabel from '~/helpers/svelte-components/label/IconLabel.svelte';

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

      {#if $document.system.check[idx].resolveCost > 0
      || $document.system.check[idx].resistanceCheck !== 'none'
      || $document.system.check[idx].opposedCheck.enabled === true}
         {#if $appState.isExpanded.sidebar.check[idx]}
            <!--Collapse button-->
            <IconButton
               icon="{EXPANDED_ICON}"
               on:click={() => {
                              $appState.isExpanded.sidebar.check[idx] = false;
                           }}
            />
         {:else}
            <!--Expand button-->
            <IconButton
               icon="{COLLAPSED_ICON}"
               on:click={() => {
                              $appState.isExpanded.sidebar.check[idx] = true;
                           }}
            />
         {/if}
      {/if}

      {#if $appState.isExpanded.sidebar.check[idx]
      && ($document.system.check[idx].resolveCost > 0
         || $document.system.check[idx].resistanceCheck !== 'none'
         || $document.system.check[idx].opposedCheck.enabled === true)}
         <div class="advanced-stats" transition:slide|local>
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
                  <div class="label">
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
                  <div class="label">
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

      .advanced-stats {
         @include border-bottom-sides;
         @include panel-2;
         @include flex-column;
         @include flex-group-top;

         width: 100%;
         margin: var(--titan-spacing-large);
      }
   }
</style>
