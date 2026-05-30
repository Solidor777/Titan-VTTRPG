<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import { EDIT_ICON, SHEET_ICON } from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * @typedef {object} CharacterSheetItemEditButtonProps
    * @property {Item} [item] The Item this button is for.
    */

   /** @type {CharacterSheetItemEditButtonProps} */
   const { item = undefined } = $props();
</script>

<IconButton
   icon={$document.isOwner ? EDIT_ICON : SHEET_ICON}
   onclick={() => item.sheet.render(true)}
   tooltip={localize($document.isOwner ? 'editItem' : 'viewItemSheet')}
/>
