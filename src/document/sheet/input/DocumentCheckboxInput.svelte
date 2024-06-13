<script>
   import {getContext} from 'svelte';
   import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /**
    * Update the document data when the input changes.
    */
   function updateDocument() {
      if ($document?.isOwner && !disabled) {
         $document.update({
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
   on:change={updateDocument}
/>
