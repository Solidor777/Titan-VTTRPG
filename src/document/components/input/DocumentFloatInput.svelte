<script>
   import {getContext} from 'svelte';
   import FloatInput from '~/helpers/svelte-components/input/FloatInput.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value for this input, or false if there is none. */
   export let min = false;

   /** @type {number|boolean} The maximum value for this input, or false if there is none. */
   export let max = false;

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

<FloatInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {max}
   {min}
   on:change
   on:change={updateDocument}
/>
