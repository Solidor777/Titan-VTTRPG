<script>
   import { getContext } from 'svelte';
   import SkillSelect from '~/helpers/svelte-components/select/SkillSelect.svelte';

   // The value of the input
   export let value;

   // Whether to allow none
   export let allowNone = false;

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

<SkillSelect
   {allowNone}
   disabled={disabled || !$document?.isOwner}
   bind:value
   on:change
   on:change={()=> updateDocument()}
   />
