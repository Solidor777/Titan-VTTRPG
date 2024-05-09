<script>
   import { getContext } from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   // The value of the input
   export let value;

   // Document reference
   const document = getContext('document');

   export let disabled = false;

   // Updates the document data when the input changes
   async function updateDocument() {
      if ($document?.isOwner) {
         await $document.update({
            system: $document.system,
            flags: $document.flags,
         });
      }
   }
</script>

<CheckboxInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
   />
