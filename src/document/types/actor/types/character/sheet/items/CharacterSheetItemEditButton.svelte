<script>
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import {EDIT_ICON} from '~/system/Icons.js';

   /** @type {boolean} Whether this Item is currently expanded. */
   export let item = void 0;
</script>

<IconButton
   icon={EDIT_ICON}
   on:click={() => {
      item.sheet.render(true);
   }}
/>
