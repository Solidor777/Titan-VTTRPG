<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   // Item reference
   export let item = void 0;
   export let equipped = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<ToggleButton
   active={equipped}
   label={localize('equipped')}
   on:click={() => $document.system.toggleEquipped(item._id)}
/>
