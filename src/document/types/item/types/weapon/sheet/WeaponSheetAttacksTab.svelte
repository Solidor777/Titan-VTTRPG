<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import Text from '~/helpers/svelte-components/Text.svelte';
   import DocumentOwnerButton from '~/document/svelte-components/DocumentOwnerButton.svelte';
   import ScrollingContainer from '~/helpers/svelte-components/ScrollingContainer.svelte';
   import TopFilter from '~/helpers/svelte-components/input/TopFilter.svelte';
   import WeaponSheetAttackSettings from '~/document/types/item/types/weapon/sheet/WeaponSheetAttackSettings.svelte';
   import { CREATE_ICON } from '~/system/Icons.js';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this list, distinguishing a reorder from a foreign-sheet copy. */
   const sourceKey = $derived(`${document.data.uuid}:attack`);

   /** @type {number[]} The filtered list of attack indices to display. */
   const filteredEntries = $derived.by(() => {
      const result = [];
      document.data.system.attack.forEach((entry, idx) => {
         if (
            entry.label
               .toLowerCase()
               .indexOf($appState.tabs.attacks.filter.toLowerCase()) !== -1
         ) {
            result.push(idx);
         }
      });
      return result;
   });
</script>

<div class="tab">
   <!--Filter-->
   {#if document.data.system.attack.length > 0}
      <div class="filter" transition:slide|local>
         <TopFilter bind:value={$appState.tabs.attacks.filter}/>
      </div>
   {/if}

   <!--Scrolling Content-->
   <ScrollingContainer bind:scrollTop={$appState.tabs.attacks.scrollTop}>
      <div class="scrolling-content">
         <!--Attacks List-->
         {#if document.data.system.attack.length > 0}
            <ol
               out:slide|local
               use:reorderDropZone={{
                  kind: 'attack',
                  sourceKey,
                  rowSelector: 'li.reorder-row',
                  acceptsForeign: true,
                  onIndicator: (index) => { dropIndex = index; },
                  onReorder: (from, to) => { document.data.system.moveAttack(from, to); },
                  onForeignDrop: (payload, at) => { document.data.system.insertAttack(payload.element, at); },
               }}
            >
               <!--Each Attack-->
               {#each filteredEntries as idx (document.data.system.attack[idx].uuid)}
                  {#if dropIndex === idx}
                     <InsertionLine/>
                  {/if}
                  <li
                     class="reorder-row"
                     data-row-index={idx}
                     out:slide|local
                     use:draggableRow={{
                        kind: 'attack',
                        sourceKey,
                        index: idx,
                        getDataTransfer: () => JSON.stringify({
                           titanElementDrag: true,
                           kind: 'attack',
                           sourceDocUuid: document.data.uuid,
                           sourceIdx: idx,
                           element: document.data.system.attack[idx],
                        }),
                     }}
                  >
                     <WeaponSheetAttackSettings {idx}/>
                  </li>
               {/each}
               {#if dropIndex === document.data.system.attack.length}
                  <InsertionLine/>
               {/if}
            </ol>
         {/if}

         <!--Add Attack Button-->
         <div class="add-entry-button">
            <DocumentOwnerButton
               onclick={() => {
                  document.data.system.addAttack();
               }}
            >
               <!--Button Content-->
               <div class="button-content">
                  <!--Icon-->
                  <i class={CREATE_ICON}></i>

                  <!--Label-->
                  <div class="label">
                     <Text text="addAttack"/>
                  </div>
               </div>
            </DocumentOwnerButton>
         </div>
      </div>
   </ScrollingContainer>
</div>

<!--For Each attack-->
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
   }
</style>
