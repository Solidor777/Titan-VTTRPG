<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';

   /** @type {object} Reference to the Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');

   export let entries = void 0;

   export let filterFunction = void 0;

   export let mapFunction = void 0;

   export let idFunction = (entry, idx) => {
      return idx;
   };

   // Initialize filtered entries
   let filteredEntries;
   $:{
      filteredEntries = entries.filter((entry) => filterFunction(entry));
      filteredEntries = filteredEntries.map((entry, idx) => mapFunction(entry, idx));
   }
   export let componentFunction;
   export let propsFunction = void 0;
</script>


{#if filteredEntries.length > 0}
   <ol out:slide|local>
      {#each entries as entry, idx (idFunction(entry, idx))}
         <li transition:slide|local>
            <svelte:component
               this={componentFunction(entry)}
               {...propsFunction(entry, idx) }
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
