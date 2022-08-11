<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import TextInput from "~/helpers/svelte-components/TextInput.svelte";

   // The value of the input
   export let value;

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

<TextInput
   bind:value
   on:change={async () => {
      $document.update(data);
   }}
/>
