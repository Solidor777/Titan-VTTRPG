<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value = void 0;
   export let positive = false;
   let medium = value;

   function validateInput(medium) {
      let retVal = parseInt(medium);
      if (isNaN(retVal)) {
         retVal = 0;
      }
      return retVal;
   }

   $: value = validateInput(medium);

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
      } else if (event.key === "-" && (positive || input.length > 0)) {
         event.preventDefault();
      } else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }
</script>

<input type="number" bind:value={medium} on:keypress={(event) => checkInput(event)} />

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;
   }
</style>
