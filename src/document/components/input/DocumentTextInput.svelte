<script>
   import {getContext} from 'svelte';
   import TextInput from '~/helpers/svelte-components/input/TextInput.svelte';

   /** @type string The value that this input should modify. */
   export let value = void 0;

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type Document Reference to the Document this Application is for. */
   const document = getContext('document');

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

<TextInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   on:change
   on:change={updateDocument}
   on:keyup
   on:keyup={updateDocument}
/>
