<script>
   import { getContext } from 'svelte';
   import { DELETE_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import DocumentOwnerIconButton from '~/document/svelte-components/DocumentOwnerIconButton.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CharacterSheetItemDeleteButtonProps
    * @property {string} [itemId] The ID of the item this button is for.
    */

   /** @type {CharacterSheetItemDeleteButtonProps} */
   const { itemId = undefined } = $props();
</script>

<DocumentOwnerIconButton
   icon={DELETE_ICON}
   label={localize('deleteItem')}
   onclick={() => document.data.system.requestItemDeletion(itemId)}
   tooltip={localize('deleteItem')}
/>
