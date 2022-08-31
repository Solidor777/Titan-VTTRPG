<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value = void 0;
   export let min = false;
   export let max = false;
   export let disabled = false;

   function validateInput() {
      value = parseInt(value);
      if (min !== false) {
         value = Math.max(value, min);
      }
      if (max !== false) {
         value = Math.min(value, max);
      }
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
      } else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }
</script>

<input
   type="number"
   on:change={validateInput}
   on:change
   bind:value
   on:keypress={(event) => checkInput(event)}
   {disabled}
/>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   input {
      @include input;

      &:disabled {
         @include input-disabled;
      }
   }
</style>
