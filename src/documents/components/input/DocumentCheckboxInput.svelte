<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   // Document reference
   const document = getContext("DocumentStore");

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

<input
   type="checkbox"
   bind:checked={value}
   on:change={async () => {
      $document.update(data);
   }}
/>
