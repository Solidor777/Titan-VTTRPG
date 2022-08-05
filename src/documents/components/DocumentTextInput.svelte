<svelte:options accessors={true} />

<script>
   import { getContext } from "svelte";

   // The value of the input
   export let value;

   let medium = value;

   // The type of input
   // Text or Number
   export let type = "text";

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

   function validateInput(medium) {
      if (type !== "text") {
         let retVal = type === "integer" ? parseInt(medium) : parseFloat(medium);
         if (isNaN(retVal)) {
            retVal = 0;
         }
         return retVal;
      } else {
         return medium;
      }
   }

   // Filter the value appropriately
   $: value = validateInput(medium);

   /**
    * If number, only allow numbers.
    * If text, allow anything
    */
   function checkInput(event) {
      // Do nothing if this is not a number or integer
      if (type !== "number" && type !== "integer") {
         return;
      }
      // Input equals the target value
      const input = event.target.value;

      // Only accept valid inputs
      if (!/[0-9\.,-]/.test(event.key)) {
         event.preventDefault();
      } else if (event.key === "-" && input.length > 0) {
         event.preventDefault();
      } else if (/[\.,]/.test(event.key) && (type === "integer" || input.includes(",") || input.includes("."))) {
         event.preventDefault();
      }
   }
</script>

<input
   bind:value={medium}
   on:keypress={(event) => checkInput(event)}
   on:change={() => {
      console.log($document.name);
      $document.update(data);
      console.log($document.name);
   }}
/>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
