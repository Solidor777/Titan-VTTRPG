<script>
   import { getContext } from 'svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';

   // The value of the input
   export let value = void 0;
   export let min = false;
   export let max = false;
   export let disabled = false;
   export let increment = 1;
   export let modifierIncrement = 10;

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

<IntegerIncrementInput
   {min}
   {max}
   disabled={disabled || !$document?.isOwner}
   {increment}
   {modifierIncrement}
   bind:value
   on:change
   on:change={()=> updateDocument()}
   />
