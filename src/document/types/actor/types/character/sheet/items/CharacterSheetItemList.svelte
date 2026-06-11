<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import DragHandle from '~/helpers/svelte-components/drag-reorder/DragHandle.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   /**
    * @typedef {object} CharacterSheetItemListProps
    * @property {typeof import('svelte').SvelteComponent} [itemComponent] Component class for the item.
    * @property {Function} [filterFunction] Filter function for the items.
    * @property {string} [filter] Optional filter for the items.
    * @property {string} [tabKey] - The applicationState tab key whose isExpanded map backs these rows.
    */

   /** @type {CharacterSheetItemListProps} */
   const {
      itemComponent = undefined,
      filterFunction = undefined,
      filter = '',
      tabKey = undefined,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this actor's item list, distinguishing a reorder from a foreign drop. */
   const sourceKey = $derived(`${document.data.uuid}:item`);

   // Sort and filter items.
   /** @type {*[]} The filtered and sorted list of items to display. */
   let items = $derived(
      document.data.items.filter((item) => {
         return (
            filterFunction(item) &&
            item.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1
         );
      }).sort((a, b) => sortAscending(a.sort, b.sort))
   );

   /**
    * Commits a same-actor item reorder by integer-sorting the source relative to the row at the
    * insertion point, so only the moved item's sort changes (siblings in other categories keep
    * their order).
    * @param {number} fromIdx - The dragged item's index in the filtered/sorted list.
    * @param {number} toIdx - The insertion point in the filtered/sorted list.
    * @returns {Promise<void>}
    */
   async function reorderItem(fromIdx, toIdx) {
      /** @type {object | undefined} The item being moved. */
      const source = items[fromIdx];
      if (!source || toIdx === fromIdx || toIdx === fromIdx + 1) {
         return;
      }

      /** @type {object[]} The other visible items, the sort frame for this move. */
      const siblings = items.filter((item) => item._id !== source._id);

      /** @type {object | undefined} The neighbor the moved item anchors against. */
      const target = toIdx >= items.length ? items[items.length - 1] : items[toIdx];

      /** @type {boolean} Place before the target when dropping above it; after when appending. */
      const sortBefore = toIdx < items.length;
      if (!target || target._id === source._id) {
         return;
      }

      /** @type {object[]} The minimal sort updates produced by the integer-sort helper. */
      const updates = foundry.utils.performIntegerSort(source, { target, siblings, sortBefore });
      await document.data.updateEmbeddedDocuments(
         'Item',
         updates.map((entry) => {
            return { ...entry.update, _id: entry.target._id };
         }),
      );
   }
</script>

<!--Item List-->
{#if items.length > 0}
   <ol
      transition:slide|local
      use:reorderDropZone={{
         kind: 'item',
         sourceKey,
         rowSelector: 'li.reorder-row',
         onIndicator: (index) => { dropIndex = index; },
         onReorder: (from, to) => { reorderItem(from, to); },
      }}
   >
      <!--Each Item-->
      {#each items as item, idx (item._id)}
         {#if dropIndex === idx}
            <InsertionLine/>
         {/if}
         <li
            class="item reorder-row"
            data-item-id={item._id}
            data-row-index={idx}
            transition:slide|local
            use:draggableRow={{
               kind: 'item',
               sourceKey,
               index: idx,
               getDataTransfer: () => JSON.stringify(document.data.items.get(item._id).toDragData()),
            }}
         >
            <DragHandle/>
            <div class="row-content">
               <EmbeddedDocumentProvider doc={item}>
                  {#each [itemComponent] as ItemComponent}
                     <ItemComponent bind:isExpanded={$appState.tabs[tabKey].isExpanded[item._id]}/>
                  {/each}
               </EmbeddedDocumentProvider>
            </div>
         </li>
      {/each}
      {#if dropIndex === items.length}
         <InsertionLine/>
      {/if}
   </ol>
{/if}

<style lang="scss">
   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;

      width: 100%;
      list-style: none;

      li {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         .row-content {
            flex: 1;
            min-width: 0;
         }

         &:not(:first-child) {
            @include margin-top-large;
         }
      }
   }
</style>
