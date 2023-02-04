<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import SpellSheetCustomAspectSettings from './SpellSheetCustomAspectSettings.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
   const appState = getContext('ApplicationStateStore');
   const application = getContext('external').application;

   // Filter for the aspects to display
   let filter = '';
   let filteredAspects = [];
   $: {
      filteredAspects = [];
      $document.system.customAspect.forEach((aspect, idx) => {
         if (aspect.label.toLowerCase().indexOf(filter.toLowerCase()) !== -1) {
            filteredAspects.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.customAspect && $document.system.customAspect.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter />
      </div>
   {/if}

   <!--Scrolling Aspects list-->
   <div class="scrolling-content">
      <ScrollingContainer bind:scrollTop={$appState.scrollTop.customAspect}>
         <ol>
            <!--Each Aspect-->
            {#each filteredAspects as idx ($document.system.customAspect[idx].uuid)}
               <li transition:slide|local>
                  <SpellSheetCustomAspectSettings {idx} />
               </li>
            {/each}
         </ol>

         <!--Add Entry Button-->
         <div class="add-entry-button">
            <EfxButton
               on:click={() => {
                  application.addCustomAspect();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="fas fa-circle-plus" />

                  <!--Label-->
                  <div class="label">
                     {localize('addCustomAspect')}
                  </div>
               </div>
            </EfxButton>
         </div>
      </ScrollingContainer>
   </div>
</div>

<style lang="scss">
   @import '../../../../Styles/Mixins.scss';

   .tab {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;

            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;

            li {
               width: 100%;
               margin-top: 0.5rem;
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: 0.25rem;
               }
            }
         }
      }
   }
</style>
