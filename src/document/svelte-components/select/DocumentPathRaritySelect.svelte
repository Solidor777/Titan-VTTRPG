<script>
   import { getContext, untrack } from 'svelte';
   import RaritySelect from '~/helpers/svelte-components/input/select/RaritySelect.svelte';
   import resolveObjectPath from '~/helpers/utility-functions/ResolveObjectPath.js';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /**
    * @typedef {object} DocumentPathRaritySelectProps
    * @property {string} [path] - Path to the value that this input should modify.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {DocumentPathRaritySelectProps} */
   let {
      path = 'system.rarity',
      disabled = false,
      tooltip = void 0,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Input value resolved from the document path on mount. */
   let value = $state(untrack(() => resolveObjectPath($document, path)));
</script>

<RaritySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   onchange={() => refreshSystemDocument($document, disabled)}
   {tooltip}
/>
