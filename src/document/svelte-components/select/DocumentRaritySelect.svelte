<script>
   import RaritySelect from '~/helpers/svelte-components/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;
</script>

<RaritySelect
   bind:value={value}
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
/>
