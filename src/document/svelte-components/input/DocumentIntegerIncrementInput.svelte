<script>
   import {getContext} from 'svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value for this input, or false if there is none. */
   export let min = false;

   /** @type {number|boolean} The maximum value for this input, or false if there is none. */
   export let max = false;

   /** @type boolean Whether editing this input should be disabled. */
   export let disabled = false;

   /** @type number The increment by which to increase or decrease the value when clicking the corresponding buttons. */
   export let increment = 1;

   /**
    * @type number The increment by which to increase or decrease the value when clicking the corresponding buttons
    * while the modifier key is pressed.
    */
   export let modifierIncrement = 10;

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

<IntegerIncrementInput
   bind:value
   disabled={disabled || !$document?.isOwner}
   {increment}
   {max}
   {min}
   {modifierIncrement}
   on:change
   on:change={updateDocument}
/>
