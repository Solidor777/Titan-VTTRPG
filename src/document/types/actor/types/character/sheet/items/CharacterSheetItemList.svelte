<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';

   // Component class for the item
   /** @type {typeof import("svelte").SvelteComponent} */
   export let itemComponent = void 0;

   // Filter function
   /** @type {Function} */
   export let filterFunction = void 0;

   // Optional filter for the items
   /** @type {string} */
   export let filter = '';

   // Is expanded map
   /** @type {object} */
   export let isExpandedMap = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Currently drag hovered state
   /** @type {boolean} */
   let isDragHovering = false;
   /** @type {string} */
   let hoveredItemId = '';

   // Drag item start
   /**
    * @param event
    * @param id
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

   // Drag item hovered
   /**
    * @param id
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

   // Sort and filter items
   /** @type {*[]} */
   let items = [];
   $: {
      items = $document.items.filter((item) => {
         return (
            filterFunction(item) &&
            item.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1
         );
      }).sort((a, b) => sortAscending(a.sort, b.sort));
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
            on:dragstart={(event) => {
               onDragStart(event, item._id, 'item');
            }}
            on:dragenter={() => {
               onDragEnter(item._id, 'item');
            }}
            on:dragend={() => {
               onDragEnd();
            }}
            transition:slide|local
         >
            <svelte:component
               this={itemComponent}
               {item}
               bind:isExpanded={isExpandedMap[item._id]}
            />
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
            margin-top: var(--titan-spacing-large);
         }
      }
   }
</style>
