<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import FiltereedList from '~/helpers/svelte-components/FiltereedList.svelte';
   import ItemSheetCheckSettings from '~/document/types/item/sheet/check/ItemSheetCheckSettings.svelte';

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Initialize filtered entries
   let filteredEntries;
   $: {
      filteredEntries = [];
      for (const [idx, entry] of $document.system.check.entries()) {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.checks.filter.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      }
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if $document.system.check.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:value={$appState.tabs.checks.filter}/>
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer bind:scrollTop={$appState.tabs.checks.scrollTop}>
      <div class="scrolling-content">
         <!--Checks List-->
         <FiltereedList
            componentFunction={() => ItemSheetCheckSettings}
            entries={$document.system.check}
            filterFunction={(entry) => entry.label.toLowerCase().includes($appState.tabs.checks.filter.toLowerCase())}
            idFunction={(entry) => entry.uuid}
            mapFunction={(entry, idx) => idx}
            propsFunction={(entry, idx) => {
              return {idx}
            }}
         />

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
                  <i class={CREATE_ICON}/>

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

         .add-entry-button {
            @include flex-row;
            @include flex-group-center;

            width: 100%;
            margin-top: var(--titan-spacing-large);

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  margin-right: var(--titan-spacing-standard);
               }
            }
         }
      }
   }
</style>
