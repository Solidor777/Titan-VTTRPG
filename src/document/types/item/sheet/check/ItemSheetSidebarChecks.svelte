<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import ItemSheetSidebarCheck from '~/document/types/item/sheet/check/ItemSheetSidebarCheck.svelte';

   /** @type {getContext<Document>} Reference to the Document store. */
   const document = getContext('document');

   /** @type {object} Reference to the Application State store. */
   const appState = getContext('applicationState');
</script>
<ol class="checks">
   {#each $document.system.check as check, idx (check.uuid)}
      {#if $document.system.check[idx]}
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
   }
</style>
