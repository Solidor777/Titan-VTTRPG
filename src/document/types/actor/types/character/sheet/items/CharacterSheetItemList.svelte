<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';

   /**
    * @typedef {object} CharacterSheetItemListProps
    * @property {typeof import('svelte').SvelteComponent} [itemComponent] Component class for the item.
    * @property {Function} [filterFunction] Filter function for the items.
    * @property {string} [filter] Optional filter for the items.
    * @property {object} [isExpandedMap] Map of item IDs to their expanded state.
    */

   /** @type {CharacterSheetItemListProps} */
   const { itemComponent = undefined, filterFunction = undefined, filter = '', isExpandedMap = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Currently drag hovered state.
   /** @type {boolean} Whether a drag is currently in progress. */
   let isDragHovering = $state(false);
   /** @type {string} The ID of the item currently being drag-hovered. */
   let hoveredItemId = $state('');

   // Sort and filter items.
   /** @type {*[]} The filtered and sorted list of items to display. */
   let items = $derived(
      $document.items.filter((item) => {
         return (
            filterFunction(item) &&
            item.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1
         );
      }).sort((a, b) => sortAscending(a.sort, b.sort))
   );

   // Drag item start.
   /**
    * @param {DragEvent} event - The drag event.
    * @param {string} id - The ID of the item being dragged.
    */
   function onDragStart(event, id) {
      const item = $document.items.get(id);
      const dragData = item.toDragData();

      if (!dragData) {
         return;
      }

      hoveredItemId = id;
      isDragHovering = true;

      event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
   }

   // Drag item hovered.
   /**
    * @param {string} id - The ID of the item being hovered over.
    */
   function onDragEnter(id) {
      if (isDragHovering) {
         hoveredItemId = id;
      }
   }

   /**
    * Handles the end of an item drag event, resetting drag state.
    */
   function onDragEnd() {
      hoveredItemId = '';
      isDragHovering = false;
   }
</script>

<!--Item List-->
{#if items.length > 0}
   <ol transition:slide|local>
      <!--Each Item-->
      {#each items as item (item._id)}
         <li
            class="item{hoveredItemId === item._id ? ' drag-hovered' : ''}"
            data-item-id={item._id}
            draggable={true}
            ondragstart={(event) => {
               onDragStart(event, item._id, 'item');
            }}
            ondragenter={() => {
               onDragEnter(item._id, 'item');
            }}
            ondragend={() => {
               onDragEnd();
            }}
            transition:slide|local
         >
            {#each [itemComponent] as ItemComponent}
               <ItemComponent
                  {item}
                  bind:isExpanded={isExpandedMap[item._id]}
               />
            {/each}
         </li>
      {/each}
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
         @include flex-space-between;

         width: 100%;

         &.drag-hovered {
            background: var(--titan-highlighted-background);
         }

         &:not(:first-child) {
            @include margin-top-large;
         }
      }
   }
</style>
