<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /** @type {TitanItem} The Item this component belongs to. */
   export let item = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ToggleButton
   active={item.system.active}
   label={localize('active')}
   onclick={() => $document.system.toggleEffectActive(item._id)}
/>
