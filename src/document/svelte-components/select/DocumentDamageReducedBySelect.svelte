<script>
   import {getContext} from 'svelte';
   import DamageReducedBySelect from '~/helpers/svelte-components/select/DamageReducedBySelect.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type boolean Whether to allow Resistance Check as an option */
   export let allowResistanceCheck = true;

   /** @type boolean Whether to allow Opposed Check as an option */
   export let allowOpposedCheck = true;

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

<DamageReducedBySelect
   {allowOpposedCheck}
   {allowResistanceCheck}
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={()=> updateDocument()}
/>
