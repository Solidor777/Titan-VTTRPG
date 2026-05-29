<script>
   import { getContext } from 'svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The ID of the item this button is for. */
   export let itemId = void 0;
</script>

<DocumentOwnerIconButton
   icon={DELETE_ICON}
   onclick={() => $document.system.requestItemDeletion(itemId)}
   tooltip={localize('deleteItem')}
/>
