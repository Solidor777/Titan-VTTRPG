<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { EDIT_ICON, SHEET_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /**@type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type Item The Item this button is for. */
   export let item = void 0;
</script>

<IconButton
   icon={$document.isOwner ? EDIT_ICON : SHEET_ICON}
   on:click={() => item.sheet.render(true)}
   tooltip={localize($document.isOwner ? 'editItem' : 'viewItemSheet')}
/>
