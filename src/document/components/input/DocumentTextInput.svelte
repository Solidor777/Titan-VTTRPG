<script>
   import { getContext } from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   // The value of the input
   export let value;

   export let disabled = false;

   // Document reference
   const document = getContext('document');

   // Updates the document data when the input changes
   async function updateDocument() {
      if ($document?.isOwner) {
         await $document.update({
            system: $document.system,
            flags: $document.flags,
            name: $document.name,
         });
      }
   }
</script>

<TextInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:keyup
   on:keyup={() => updateDocument()}
   on:change
   on:change={()=> updateDocument()}
   on:keyup
/>
