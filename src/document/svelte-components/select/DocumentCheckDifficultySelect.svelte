<script>
   import {getContext} from 'svelte';
   import CheckDifficultySelect from '~/helpers/svelte-components/select/CheckDifficultySelect.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

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

<CheckDifficultySelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
/>
