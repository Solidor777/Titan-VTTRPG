<script>
   import {getContext} from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {DELETE_ICON} from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type {string} The ID of the item this button is for. */
   export let itemId = void 0;
</script>

<IconButton
   icon={DELETE_ICON}
   on:click={() => $document.system.requestItemDeletion(itemId)}
   tooltip={localize('deleteItem')}
/>
