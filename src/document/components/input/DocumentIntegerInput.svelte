<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   // The value of the input
   export let value;

   export let min = false;

   export let max = false;

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

<IntegerInput
   bind:value
   {min}
   {max}
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
   on:keyup
   />
