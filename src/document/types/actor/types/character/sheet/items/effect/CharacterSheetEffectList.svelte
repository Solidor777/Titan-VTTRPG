<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import sortAscending from '~/helpers/utility-functions/SortAscending.js';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import CharacterSheetEffect
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffect.svelte';
   import DragHandle from '~/helpers/svelte-components/drag-reorder/DragHandle.svelte';
   import InsertionLine from '~/helpers/svelte-components/drag-reorder/InsertionLine.svelte';
   import { draggableRow, reorderDropZone } from '~/helpers/svelte-components/drag-reorder/DragReorderActions.js';

   /**
    * @typedef {object} CharacterSheetEffectListProps
    * @property {string} [filter] - Optional name filter for the effects.
    */

   /** @type {CharacterSheetEffectListProps} */
   const { filter = '' } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {number | null} The live insertion index for the drop line, or null when idle. */
   let dropIndex = $state(null);

   /** @type {string} Identity of this actor's effect list, distinguishing a reorder from a foreign drop. */
   const sourceKey = $derived(`${document.data.uuid}:effect`);

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

   /**
    * Commits an effect reorder by integer-sorting the source relative to the effect at the insertion
    * point, so only the moved effect's sort changes.
    * @param {number} fromIdx - The dragged effect's index in the filtered/sorted list.
    * @param {number} toIdx - The insertion point in the filtered/sorted list.
    * @returns {Promise<void>}
    */
   async function reorderEffect(fromIdx, toIdx) {
      /** @type {object | undefined} The effect being moved. */
      const source = effects[fromIdx];
      if (!source || toIdx === fromIdx || toIdx === fromIdx + 1) {
         return;
      }

      /** @type {object[]} The other visible effects, the sort frame for this move. */
      const siblings = effects.filter((effect) => effect._id !== source._id);

      /** @type {object | undefined} The neighbor the moved effect anchors against. */
      const target = toIdx >= effects.length ? effects[effects.length - 1] : effects[toIdx];

      /** @type {boolean} Place before the target when dropping above it; after when appending. */
      const sortBefore = toIdx < effects.length;
      if (!target || target._id === source._id) {
         return;
      }

      /** @type {object[]} The minimal sort updates produced by the integer-sort helper. */
      const updates = foundry.utils.performIntegerSort(source, { target, siblings, sortBefore });
      await document.data.updateEmbeddedDocuments(
         'ActiveEffect',
         updates.map((entry) => {
            return { ...entry.update, _id: entry.target._id };
         }),
      );
   }
</script>

<!--Effect List-->
{#if effects.length > 0}
   <ol
      transition:slide|local
      use:reorderDropZone={{
         kind: 'effect',
         sourceKey,
         rowSelector: 'li.reorder-row',
         onIndicator: (index) => { dropIndex = index; },
         onReorder: (from, to) => { reorderEffect(from, to); },
      }}
   >
      <!--Each Effect-->
      {#each effects as effect, idx (effect.id)}
         {#if dropIndex === idx}
            <InsertionLine/>
         {/if}
         <li
            class="effect reorder-row"
            data-effect-id={effect.id}
            data-row-index={idx}
            transition:slide|local
            use:draggableRow={{
               kind: 'effect',
               sourceKey,
               index: idx,
               getDataTransfer: () => JSON.stringify(document.data.effects.get(effect.id).toDragData()),
            }}
         >
            <DragHandle/>
            <div class="row-content">
               <EmbeddedDocumentProvider doc={effect}>
                  <CharacterSheetEffect bind:isExpanded={$appState.tabs.effects.isExpanded[effect.id]}/>
               </EmbeddedDocumentProvider>
            </div>
         </li>
      {/each}
      {#if dropIndex === effects.length}
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
