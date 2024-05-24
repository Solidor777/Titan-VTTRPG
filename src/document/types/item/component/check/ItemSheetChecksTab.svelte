<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/TopFilter.svelte';
   import ItemSheetCheckSettings from '~/document/types/item/component/check/ItemSheetCheckSettings.svelte';
   import {CREATE_ICON} from '~/system/Icons.js';

   // Setup context variables
   const document = getContext('document');
   const appState = getContext('applicationState');

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
         <TopFilter bind:filter={$appState.filter.checks}/>
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
                     <ItemSheetCheckSettings {idx}/>
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add check Button-->
         <div class="add-entry-button">
            <Button
               on:click={() => {
                  $document.addCheck();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class="{CREATE_ICON}"/>

                  <!--Label-->
                  <div class="label">
                     {localize('addCheck')}
                  </div>
               </div>
            </Button>
         </div>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;

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
               margin-top: var(--padding-large);
            }
         }

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin-top: var(--padding-large);

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: var(--padding-standard);
               }
            }
         }
      }
   }
</style>
