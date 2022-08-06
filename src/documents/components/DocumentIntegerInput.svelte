<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";

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

   function validateInput(value) {
      let retVal = parseInt(value);
      if (isNaN(retVal)) {
         retVal = 0;
      }
      return retVal;
   }

   /**
    * If number, only allow numbers.
    * If text, allow anything
    */
   function checkInput(event) {
      // Input equals the target value
      const input = event.target.value;

      // Only accept valid inputs
      if (!/[0-9\.,-]/.test(event.key)) {
         event.preventDefault();
      } else if (event.key === "-" && input.length > 0) {
         event.preventDefault();
      } else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }
</script>

<input
   type="number"
   bind:value
   on:keypress={(event) => checkInput(event)}
   on:change={async () => {
      value = validateInput(value);
      $document.update(data);
   }}
/>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
