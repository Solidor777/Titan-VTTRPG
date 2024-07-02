<script>
   import {getContext} from 'svelte';
   import Select from '~/helpers/svelte-components/input/select/Select.svelte';

   // The value of the input
   export let value = void 0;

   // The options for the select
   export let options = void 0;

   export let disabled = false;

   /** @type object Reference to the Document store. */
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

<Select
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
   {options}
/>
