<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import SpellSheetCustomAspectSettings
      from '~/document/types/item/types/spell/sheet/SpellSheetCustomAspectSettings.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   // Initialize filtered entries.
   /** @type {*[]} */
   let filteredEntries = [];
   $: {
      filteredEntries = [];
      document.data.system.customAspect.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.customAspects.filter.toLowerCase()) !== -1
         ) {
            filteredEntries.push(idx);
         }
      });
   }
</script>

<div class="tab">
   <!--Filter-->
   {#if document.data.system.customAspect && document.data.system.customAspect.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:value={$appState.tabs.customAspects.filter}/>
      </div>
   {/if}

   <!--Scrolling Aspects list-->
   <ScrollingContainer bind:scrollTop={$appState.tabs.customAspects.scrollTop}>
      <div class="scrolling-content">
         <!--Aspects List-->
         {#if document.data.system.customAspect.length > 0}
            <ol out:slide|local>
               <!--Each Aspect-->
               {#each filteredEntries as idx (document.data.system.customAspect[idx].uuid)}
                  <li out:slide|local>
                     <SpellSheetCustomAspectSettings {idx}/>
                  </li>
               {/each}
            </ol>
         {/if}

         <!--Add Entry Button-->
         <div class="add-entry-button">
            <DocumentOwnerButton
               onclick={() => {
                  document.data.system.addCustomAspect();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class={CREATE_ICON}></i>

                  <!--Label-->
                  <div class="label">
                     <Text text="addCustomAspect"/>
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
      @include panel-2;

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

               @include margin-top-large;
            }
         }

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
