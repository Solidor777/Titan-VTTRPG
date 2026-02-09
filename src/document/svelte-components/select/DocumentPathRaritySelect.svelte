<script>
   import RaritySelect from '~/helpers/svelte-components/select/RaritySelect.svelte';
   import { getContext } from 'svelte';
   import updateDocumentPathData from '~/helpers/utility-functions/UpdateDocumentPathData.js';
   import resolveObjectPath from '~/helpers/utility-functions/ResolveObjectPath.js';

   /** @type string Path to the value that this input should modify. */
   export let path = 'system.rarity';

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string Input value. */
   let value = resolveObjectPath($document, path);
</script>

<RaritySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change={()=> updateDocumentPathData($document, disabled, path, value)}
/>
