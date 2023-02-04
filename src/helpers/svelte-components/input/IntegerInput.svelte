<svelte:options accessors={true} />

<script>
   // The value of the input
   export let value = void 0;
   export let min = false;
   export let max = false;
   export let disabled = false;
   $: input = value;

   function validateInput() {
      value = parseInt(input);
      if (isNaN(value)) {
         input = 0;
         value = 0;
      }
      if (min !== false) {
         value = Math.max(value, min);
      }
      if (max !== false) {
         value = Math.min(value, max);
      }
   }

   function checkInput(event) {
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
   bind:value={input}
   on:keypress={(event) => checkInput(event)}
   {disabled}
/>

<style lang="scss">
   @import '../../../styles/Mixins.scss';

   input {
      @include input;

      &:disabled {
         @include input-disabled;
      }
   }
</style>
