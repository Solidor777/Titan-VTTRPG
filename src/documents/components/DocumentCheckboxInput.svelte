<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";
   import { text } from "svelte/internal";

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

<input
   type="checkbox"
   bind:checked={value}
   on:change={async () => {
      $document.update(data);
   }}
/>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
