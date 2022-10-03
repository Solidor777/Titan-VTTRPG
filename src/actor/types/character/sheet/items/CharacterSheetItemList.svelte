<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";

   // Component class for the item
   export let itemComponent = void 0;

   // Filter function
   export let filterFunction = void 0;

   // Optional filter for the items
   export let filter = "";

   // Is expanded map
   export let isExpandedMap = void 0;

   // Whether the object should be expanded by default
   export let isExpandedDefault = false;

   // Character reference
   const document = getContext("DocumentStore");

   // Currently drag hovered state
   let isDragHovering = false;
   let hoveredItemId = "";

   // Drag item start
   function onDragStart(event, id, type) {
      const item = $document.items.get(id);
      const dragData = item.toDragData();

      if (!dragData) {
         return;
      }

      hoveredItemId = id;
      isDragHovering = true;

      event.dataTransfer.setData("text/plain", JSON.stringify(dragData));

      return;
   }

   // Drag item hovered
   function onDragEnter(id, type) {
      if (isDragHovering) {
         hoveredItemId = id;
      }
   }

   // Drag item end
   function onDragEnd() {
      hoveredItemId = "";
      isDragHovering = false;
   }

   // Initialize expanded object
   $document.items
      .filter((item) => {
         return filterFunction(item);
      })
      .forEach((item) => {
         isExpandedMap[item._id] = isExpandedMap[item._id] ?? isExpandedDefault;
      });

   // Sort and filter items
   $: items = $document.items
      .filter((item) => {
         return filterFunction(item) && item.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1;
      })
      .sort((a, b) => {
         if (a.sort < b.sort) {
            return -1;
         }
         if (a.sort > b.sort) {
            return 1;
         }
         return 0;
      });
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
               onDragStart(event, item._id, "item");
            }}
            on:dragenter={() => {
               onDragEnter(item._id, "item");
            }}
            on:dragend={() => {
               onDragEnd();
            }}
            transition:slide|local
         >
            <svelte:component this={itemComponent} id={item._id} bind:isExpanded={isExpandedMap[item._id]} />
         </li>
      {/each}
   </ol>
{/if}

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

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
            background: var(--highlight-background-color);
         }

         &:not(:first-child) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
