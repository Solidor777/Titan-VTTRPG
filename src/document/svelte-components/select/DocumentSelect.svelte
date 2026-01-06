<script>
   import { getContext } from 'svelte';
   import Select from '~/helpers/svelte-components/select/Select.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type * The value that this input should modify. */
   export let value = void 0;

   /** @type SelectOption[] Options for the Select svelte component. */
   export let options = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<Select
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> refreshSystemDocument($document, disabled)}
   {options}
/>
