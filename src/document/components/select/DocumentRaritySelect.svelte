<script>
   import RaritySelect from '~/helpers/svelte-components/select/RaritySelect.svelte';
   import { getContext } from 'svelte';

   // The value of the input
   export let value;

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

<RaritySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
   />
