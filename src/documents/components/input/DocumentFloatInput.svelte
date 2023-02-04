<svelte:options accessors={true} />

<script>
   import { getContext } from 'svelte';
   import FloatInput from '~/helpers/svelte-components/input/FloatInput.svelte';

   // The value of the input
   export let value;

   export let min = false;

   export let max = false;

   export let disabled = false;

   // Document reference
   const document = getContext('DocumentStore');
</script>

<FloatInput
   bind:value
   {min}
   {max}
   disabled={disabled || !$document.isOwner}
   on:change
   on:change={() => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
