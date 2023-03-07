<script>
   import { createEventDispatcher } from 'svelte';

   // The value of the input
   export let value = void 0;
   export let min = false;
   export let max = false;
   export let disabled = false;

   let editingActive = false;
   let input = value;

   const dispatch = createEventDispatcher();

   $: if (!editingActive) {
      input = value;
   }

   function validateInput() {
      let newValue = parseInt(input);
      if (isNaN(newValue)) {
         newValue = 0;
      }
      if (min !== false) {
         newValue = Math.max(newValue, min);
      }
      if (max !== false) {
         newValue = Math.min(newValue, max);
      }

      value = newValue;
      dispatch('change');
   }

   function checkInput(event) {
      // Only accept valid inputs
      if (!/[0-9\.,-]/.test(event.key)) {
         event.preventDefault();
      } else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }

   function onFocus() {
      editingActive = true;
   }

   function onBlur() {
      editingActive = false;
   }

   function onChange() {
      if (isNaN(input)) {
         input = value;
      }
   }
</script>

<input
   type="number"
   on:keyup={validateInput}
   on:keyup
   on:change={onChange}
   on:focus={onFocus}
   on:focus
   on:blur={onBlur}
   on:blur
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
