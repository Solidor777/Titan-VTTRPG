<script>
   import { getContext } from 'svelte';
   import RatingSelect from '~/helpers/svelte-components/select/RatingSelect.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<RatingSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
/>
