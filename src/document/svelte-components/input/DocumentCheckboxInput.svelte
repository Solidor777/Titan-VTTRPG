<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
   import refreshSystemDocument from '~/helpers/utility-functions/RefreshSystemDocumentData.js';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;
   
</script>

<CheckboxInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:editor:save={() => refreshSystemDocument($document, disabled)}
/>
