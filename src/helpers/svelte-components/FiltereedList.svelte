<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   /** @type {*[]} The full list of entries to display. */
   export let entries = void 0;

   /** @type {Function} Function to filter the entries with. */
   export let filterFunction = void 0;

   /** @type {Function} Function to map the filtered entries. */
   export let mapFunction = void 0;

   /** @type {Function} Function to generate unique IDs for each entry. */
   export let idFunction = (entry, idx) => {
      return idx;
   };

   // Initialize filtered entries.
   let filteredEntries;
   $: {
      filteredEntries = entries.filter((entry) => filterFunction(entry));
      filteredEntries = filteredEntries.map((entry, idx) => mapFunction(entry, idx));
   }

   /** @type {Function} Function to get the component to use for an entry. */
   export let componentFunction;

   /** @type {Function} Function to get the props to use for an entry's component. */
   export let propsFunction = void 0;
</script>


{#if filteredEntries.length > 0}
   <ol out:slide|local>
      {#each entries as entry, idx (idFunction(entry, idx))}
         <li transition:slide|local>
            <svelte:component
               this={componentFunction(entry)}
               {...propsFunction(entry, idx)}
            />
         </li>
      {/each}
   </ol>
{/if}

<style lang="scss">
   ol {
      @include list;
   }
</style>
