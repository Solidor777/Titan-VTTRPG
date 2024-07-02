<script>
   import {getContext} from 'svelte';
   import ShieldTraitSelect from '~/helpers/svelte-components/select/ShieldTraitSelect.svelte';

   /** @type string The value that this input should modify. */
   export let value;

   /** @type boolean Whether to allow None as an option. */
   export let allowNone = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /**
    * Update the document data when the input changes.
    */
   async function updateDocument() {
      if ($document?.isOwner) {
         await $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }
   }
</script>

<ShieldTraitSelect
   {allowNone}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
/>
