<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import IntegerInput from "~/helpers/svelte-components/IntegerInput.svelte";

   // The value of the input
   export let value;

   export let min = false;

   export let max = false;

   export let disabled = false;

   // Document reference
   const document = getContext("DocumentSheetObject");

   // Copy of the document data
   let data;
   $: {
      data = {
         img: $document.img,
         system: $document.system,
         flags: $document.flags,
         name: $document.name,
      };
   }
</script>

<IntegerInput
   bind:value
   {min}
   {max}
   {disabled}
   on:change={async () => {
      $document.update(data);
   }}
/>
