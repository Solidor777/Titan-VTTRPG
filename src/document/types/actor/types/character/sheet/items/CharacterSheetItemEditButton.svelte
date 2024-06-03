<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {EDIT_ICON} from '~/system/Icons.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {TitanItem} The Item this button is for. */
   export let item = void 0;
</script>

<IconButton
   icon={EDIT_ICON}
   on:click={() => item.sheet.render(true)}
   tooltip={localize('editItem')}
/>
