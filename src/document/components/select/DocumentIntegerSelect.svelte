<script>
   import { getContext } from 'svelte';
   import IntegerSelect from '~/helpers/svelte-components/select/IntegerSelect.svelte';

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = void 0;

   export let disabled = false;

   // Document reference
   const document = getContext('document');

   // Updates the document data when the input changes
   /**
    *
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

<IntegerSelect
   bind:value
   {options}
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
   />
