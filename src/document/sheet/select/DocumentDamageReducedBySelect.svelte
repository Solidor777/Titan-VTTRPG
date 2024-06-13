<script>
   import {getContext} from 'svelte';
   import DamageReducedBySelect from '~/helpers/svelte-components/select/DamageReducedBySelect.svelte';

   // Value
   export let value = void 0;
   export let disabled = false;

   // Whether to allow a resistance check option
   export let allowResistanceCheck = true;

   // Whether to allow an opposed check option
   export let allowOpposedCheck = true;

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

<DamageReducedBySelect
   {allowOpposedCheck}
   {allowResistanceCheck}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
/>
