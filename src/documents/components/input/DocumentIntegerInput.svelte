<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import IntegerInput from "~/helpers/svelte-components/input/IntegerInput.svelte";

   // The value of the input
   export let value;

   export let min = false;

   export let max = false;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentStore");
</script>

<IntegerInput
   bind:value
   {min}
   {max}
   {disabled}
   on:change
   on:change={() => {
      $document.update({
         system: $document.system,
         flags: $document.flags,
      });
   }}
/>
