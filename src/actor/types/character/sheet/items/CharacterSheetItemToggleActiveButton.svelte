<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   // Item reference
   export let item = void 0;

   // Reference to the application
   const document = getContext('DocumentStore');
</script>

<ToggleButton
   active={item.system.active}
   label={localize('active')}
   on:click={() => $document.typeComponent.toggleActive(item._id)}
/>
