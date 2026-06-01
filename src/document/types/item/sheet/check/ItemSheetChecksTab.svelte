<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import FiltereedList from '~/helpers/svelte-components/FiltereedList.svelte';
   import ItemSheetCheckSettings from '~/document/types/item/sheet/check/ItemSheetCheckSettings.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>

<div class="tab">
   <!--Filter-->
   {#if document.data.system.check.length > 0}
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
            entries={document.data.system.check}
            filterFunction={(entry) => entry.label.toLowerCase().includes($appState.tabs.checks.filter.toLowerCase())}
            idFunction={(entry) => entry.uuid}
            propsFunction={(entry, idx) => {
              return {idx}
            }}
         />

         <!--Add check Button-->
         <div class="add-entry-button">
            <DocumentOwnerButton
               onclick={() => {
                  document.data.addCheck();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class={CREATE_ICON}></i>

                  <!--Label-->
                  <div class="label">
                     <Text text="addCheck"/>
                  </div>
               </div>
            </DocumentOwnerButton>
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

            @include margin-top-large;

            .button-content {
               @include flex-row;
               @include flex-group-center;

               i {
                  @include margin-right-standard;
               }
            }
         }
      }
   }
</style>
