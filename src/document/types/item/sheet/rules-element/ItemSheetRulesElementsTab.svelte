<script>
   import { getContext } from 'svelte';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import { slide } from 'svelte/transition';
   import ScrollingContainer
      from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import ItemSheetRulesElementSettings
      from '~/document/types/item/sheet/rules-element/ItemSheetRulesElementSettings.svelte';
   import DocumentOwnerButton
      from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this list, distinguishing a reorder from a foreign-sheet copy. */
   const sourceKey = $derived(`${document.data.uuid}:rulesElement`);
</script>

<div class="tab">
   {#if document.data.system.rulesElement.length > 0}
      <!--Filter-->
      <div class="filter" transition:slide|local>
         <TopFilter bind:value={$appState.tabs.rulesElements.filter}/>
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer>
      <!-- Rules Element List-->
      {#if document.data.system.rulesElement.length > 0}
         <ol
            transition:slide|local
            use:reorderDropZone={{
               kind: 'rulesElement',
               sourceKey,
               rowSelector: 'li.reorder-row',
               onIndicator: (index) => { dropIndex = index; },
               onReorder: (from, to) => { document.data.system.moveRulesElement(from, to); },
               onForeignDrop: (payload, at) => { document.data.system.insertRulesElement(payload.element, at); },
            }}
         >
            <!--Each Element-->
            {#each document.data.system.rulesElement as element, idx (element.uuid)}
               {#if dropIndex === idx}
                  <InsertionLine/>
               {/if}
               <li
                  class="reorder-row"
                  transition:slide|local
                  use:draggableRow={{
                     kind: 'rulesElement',
                     sourceKey,
                     index: idx,
                     getDataTransfer: () => JSON.stringify({
                        titanElementDrag: true,
                        kind: 'rulesElement',
                        sourceDocUuid: document.data.uuid,
                        sourceIdx: idx,
                        element: document.data.system.rulesElement[idx],
                     }),
                  }}
               >
                  <ItemSheetRulesElementSettings {idx}/>
               </li>
            {/each}
            {#if dropIndex === document.data.system.rulesElement.length}
               <InsertionLine/>
            {/if}
         </ol>
      {/if}

      <!--Add Element Button-->
      <div class="add-entry-button">
         <DocumentOwnerButton
            onclick={() => {
               document.data.system.addRulesElement();
            }}
         >
            <!--Button Content-->
            <div class="button-content">
               <!--Icon-->
               <i class={CREATE_ICON}></i>

               <!--Label-->
               <div class="label">
                  <Text text="addRulesElement"/>
               </div>
            </div>
         </DocumentOwnerButton>
      </div>
   </ScrollingContainer>
</div>

<style lang="scss">
   .tab {
      @include flex-column;
      @include flex-group-top;
      @include panel-2;

      --titan-input-font-size: var(--titan-input-font-size-small);

      height: 100%;
      width: 100%;

      .filter {
         @include flex-row;
         @include flex-group-center;

         width: 100%;
      }

      ol {
         @include flex-column;
         @include flex-group-top;
         @include list;

         width: 100%;

         li {
            @include flex-row;
            @include flex-group-center;

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
</style>
