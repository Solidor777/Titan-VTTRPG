<script>
   import {getContext} from 'svelte';
   import AttackTypeSelect from '~/helpers/svelte-components/select/AttackTypeSelect.svelte';

   /** @type string The value that this input should modify. */
   export let value;

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

<AttackTypeSelect
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
/>
