<script>
   import { slide } from 'svelte/transition';

   /**
    * @typedef {object} FiltereedListProps
    * @property {any[]} [entries] - The full list of entries to display.
    * @property {Function} [filterFunction] - Function to filter the entries with.
    * @property {Function} [idFunction] - Function to generate unique IDs for each entry.
    * @property {Function} componentFunction - Function to get the component to use for an entry.
    * @property {Function} [propsFunction] - Function to get the props for an entry's component.
    * @property {string} [testId] - Optional test id bound to the root list element for probing.
    */

   /** @type {FiltereedListProps} */
   let {
      entries = void 0,
      filterFunction = void 0,
      idFunction = (entry, idx) => idx,
      componentFunction,
      propsFunction = void 0,
      testId = void 0,
   } = $props();

   /** @type {Array<{ entry: any, idx: number }>} Entries paired with their original index, filtered. */
   const filteredEntries = $derived.by(() => {
      return entries
         .map((entry, idx) => {
            return {
               entry,
               idx,
            };
         })
         .filter(({ entry }) => filterFunction(entry));
   });
</script>


{#if filteredEntries.length > 0}
   <ol data-testid={testId} out:slide>
      {#each filteredEntries as { entry, idx } (idFunction(entry, idx))}
         {@const EntryComponent = componentFunction(entry)}
         <li transition:slide>
            <EntryComponent {...propsFunction(entry, idx)}/>
         </li>
      {/each}
   </ol>
{/if}

<style lang="scss">
   ol {
      @include list;
   }
</style>
