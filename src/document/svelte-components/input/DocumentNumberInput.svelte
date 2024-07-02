<script>
   import {getContext} from 'svelte';
   import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} The maximum value of the input. */
   export let max = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type boolean Whether the input should be an Integer. If False, it will be a Float. */
   export let isInteger = false;

   /** @type object Reference to the Document store. */
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

<NumberInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {isInteger}
   {max}
   {min}
   on:change
   on:change={updateDocument}
/>
