<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /**
    * @typedef {object} CharacterSheetItemEquipButtonProps
    * @property {TitanItem} [item] The Item this component belongs to.
    * @property {boolean} [equipped] Whether the item is currently equipped.
    */

   /** @type {CharacterSheetItemEquipButtonProps} */
   const { item = undefined, equipped = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<ToggleButton
   active={equipped}
   label={localize('equipped')}
   onclick={() => $document.system.toggleEquipped(item._id)}
/>
