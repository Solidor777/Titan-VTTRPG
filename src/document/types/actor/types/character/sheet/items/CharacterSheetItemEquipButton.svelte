<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { getContext } from 'svelte';
   import ToggleButton from '~/helpers/svelte-components/button/ToggleButton.svelte';

   /**
    * @typedef {object} CharacterSheetItemEquipButtonProps
    * @property {boolean} [equipped] Whether the item is currently equipped.
    */

   /** @type {CharacterSheetItemEquipButtonProps} */
   const { equipped = undefined } = $props();

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');
</script>

<ToggleButton
   active={equipped}
   label={localize('equipped')}
   onclick={() => sheetDocument.data.system.toggleEquipped(document.data?._id)}
/>
