<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';

   // The value of the input
   export let value;

   export let min = false;

   export let max = false;

   export let disabled = false;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<IntegerInput
   bind:value
   {min}
   {max}
   disabled={disabled || !$document.isOwner}
   on:keyup={() => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
   on:keyup
/>
