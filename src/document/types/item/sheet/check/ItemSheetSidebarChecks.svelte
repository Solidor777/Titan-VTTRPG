<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ItemSheetSidebarCheck from '~/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>
<ol class="checks">
   {#each document.data.system.check as check, idx (check.uuid)}
      {#if document.data.system.check[idx]}
         <li class="check" transition:slide|local>
            <ItemSheetSidebarCheck {idx}/>
         </li>
      {/if}
   {/each}
</ol>

<style lang="scss">
   .checks {
      @include list;

      width: 100%;

      .check:not(:first-child) {
         @include margin-top-large;
      }
   }
</style>
