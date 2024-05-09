<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { DELETE_ICON } from '~/system/Icons.js';

   // Reference to the document
   const document = getContext('document');

   // Collapsed object
   export let itemId = void 0;
</script>

<IconButton
   icon={DELETE_ICON}
   on:click={() => $document.system.requestItemDeletion(itemId)}
/>
