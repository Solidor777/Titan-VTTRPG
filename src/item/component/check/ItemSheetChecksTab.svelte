<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import EfxButton from '~/helpers/svelte-components/button/EfxButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import ItemSheetCheckSettings from './ItemSheetCheckSettings.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
   const appState = getContext('ApplicationStateStore');

   // Initialize expanded state
   $document.system.check.forEach((entry, idx) => {
      $appState.isExpanded.checks[idx] =
         $appState.isExpanded.checks[idx] ?? true;
   });

   // Initialize filtered entries
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      $document.system.check.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.filter.checks.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.check.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:filter={$appState.filter.checks} />
      </div>
   {/if}

   <!--Scroling Content-->
   <ScrollingContainer bind:scrollTop={$appState.scrollTop.checks}>
      <div class="scrolling-content">
         <!--Checks List-->
         {#if $document.system.check.length > 0}
            <ol out:slide|local>
               <!--Each check-->
               {#each filteredEntries as idx ($document.system.check[idx].uuid)}
                  <li out:slide|local>
                     <ItemSheetCheckSettings {idx} />
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add check Button-->
         <div class="add-entry-button">
            <EfxButton
               on:click={() => {
                  $document.addCheck();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="fas fa-circle-plus" />

                  <!--Label-->
                  <div class="label">
                     {localize('addCheck')}
                  </div>
               </div>
            </EfxButton>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .tab {
      @include flex-column;
      @include flex-group-top;
      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
      }

      .scrolling-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-2;
         width: 100%;
         height: 100%;

         ol {
            @include flex-column;
            @include flex-group-top;
            @include list;

            width: 100%;

            li {
               @include flex-row;
               @include flex-group-center;

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
