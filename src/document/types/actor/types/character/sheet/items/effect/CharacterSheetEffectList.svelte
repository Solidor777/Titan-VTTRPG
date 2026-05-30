<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';
   import CharacterSheetEffect
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte';

   /**
    * @typedef {object} CharacterSheetEffectListProps
    * @property {string} [filter] - Optional name filter for the effects.
    * @property {object} [isExpandedMap] - Map of effect IDs to their expanded state.
    */

   /** @type {CharacterSheetEffectListProps} */
   const { filter = '', isExpandedMap = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Currently drag hovered state.
   /** @type {boolean} Whether a drag is currently in progress. */
   let isDragHovering = $state(false);
   /** @type {string} The ID of the effect currently being drag-hovered. */
   let hoveredEffectId = $state('');

   // Sort and filter the actor's effect Active Effects.
   /** @type {TitanActiveEffect[]} The filtered and sorted list of effects to display. */
   let effects = $derived(
      document.data.effects.filter((effect) => {
         return (
            effect.type === 'effect' &&
            effect.name.toLowerCase().indexOf(filter.toLowerCase()) !== -1
         );
      }).sort((a, b) => sortAscending(a.sort, b.sort)),
   );

   // Drag effect start.
   /**
    * Begins dragging an effect, populating the drag data via the effect's native toDragData payload.
    * @param {DragEvent} event - The drag event.
    * @param {string} id - The ID of the effect being dragged.
    */
   function onDragStart(event, id) {
      /** @type {TitanActiveEffect | undefined} - The effect being dragged. */
      const effect = document.data.effects.get(id);

      /** @type {object | undefined} - The drag data payload for the effect. */
      const dragData = effect?.toDragData();

      if (!dragData) {
         return;
      }

      hoveredEffectId = id;
      isDragHovering = true;

      event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
   }

   // Drag effect hovered.
   /**
    * Tracks the effect currently hovered during a drag.
    * @param {string} id - The ID of the effect being hovered over.
    */
   function onDragEnter(id) {
      if (isDragHovering) {
         hoveredEffectId = id;
      }
   }

   /**
    * Handles the end of an effect drag event, resetting drag state.
    */
   function onDragEnd() {
      hoveredEffectId = '';
      isDragHovering = false;
   }
</script>

<!--Effect List-->
{#if effects.length > 0}
   <ol transition:slide|local>
      <!--Each Effect-->
      {#each effects as effect (effect.id)}
         <li
            class="effect{hoveredEffectId === effect.id ? ' drag-hovered' : ''}"
            data-effect-id={effect.id}
            draggable={true}
            ondragstart={(event) => {
               onDragStart(event, effect.id);
            }}
            ondragenter={() => {
               onDragEnter(effect.id);
            }}
            ondragend={() => {
               onDragEnd();
            }}
            transition:slide|local
         >
            <CharacterSheetEffect
               {effect}
               bind:isExpanded={isExpandedMap[effect.id]}
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
            @include margin-top-large;
         }
      }
   }
</style>
