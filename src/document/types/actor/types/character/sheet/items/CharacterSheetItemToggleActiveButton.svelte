<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /**
    * @typedef {object} CharacterSheetItemToggleActiveButtonProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetItemToggleActiveButtonProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ToggleButton
   active={item.system.active}
   label={localize('active')}
   onclick={() => document.data.system.toggleEffectActive(item._id)}
/>
