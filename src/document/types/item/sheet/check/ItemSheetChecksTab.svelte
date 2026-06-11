<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import ItemSheetCheckSettings from '~/document/types/item/sheet/check/ItemSheetCheckSettings.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this list, distinguishing a reorder from a foreign-sheet copy. */
   const sourceKey = $derived(`${document.data.uuid}:check`);

   /** @type {number[]} Unfiltered indices whose check matches the active filter. */
   const filteredEntries = $derived.by(() => {
      /** @type {number[]} The matching unfiltered indices. */
      const result = [];

      /** @type {string} The active lower-cased filter text. */
      const filter = $appState.tabs.checks.filter.toLowerCase();
      document.data.system.check.forEach((entry, idx) => {
         if (entry.label.toLowerCase().includes(filter)) {
            result.push(idx);
         }
      });

      return result;
   });
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
         {#if document.data.system.check.length > 0}
            <ol
               use:reorderDropZone={{
                  kind: 'check',
                  sourceKey,
                  rowSelector: 'li.reorder-row',
                  onIndicator: (index) => { dropIndex = index; },
                  onReorder: (from, to) => { document.data.moveCheck(from, to); },
                  onForeignDrop: (payload, at) => { document.data.insertCheck(payload.element, at); },
               }}
            >
               {#each filteredEntries as idx (document.data.system.check[idx].uuid)}
                  {#if dropIndex === idx}
                     <InsertionLine/>
                  {/if}
                  <li
                     class="reorder-row"
                     use:draggableRow={{
                        kind: 'check',
                        sourceKey,
                        index: idx,
                        getDataTransfer: () => JSON.stringify({
                           titanElementDrag: true,
                           kind: 'check',
                           sourceDocUuid: document.data.uuid,
                           sourceIdx: idx,
                           element: document.data.system.check[idx],
                        }),
                     }}
                  >
                     <ItemSheetCheckSettings {idx}/>
                  </li>
               {/each}
               {#if dropIndex === document.data.system.check.length}
                  <InsertionLine/>
               {/if}
            </ol>
         {/if}

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

         ol {
            @include flex-column;
            @include flex-group-top;

            list-style: none;
            padding: 0;
            margin: 0;
            width: 100%;
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
