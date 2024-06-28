<script>
   import {createEventDispatcher} from 'svelte';

   /** @type number The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} The maximum value of the input. */
   export let max = false;

   /** @type boolean Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type boolean Whether the input should be an Integer. If False, it will be a Float. */
   export let isInteger = false;

   /** @type boolean Whether editing is currently active for the input. */
   let editingActive = false;

   /** @type string The actual input from the user. */
   let input = value.toString();

   /** @type EventDispatcher Dispatcher for component Events. */
   const eventDispatcher = createEventDispatcher();

   // Update the input if the value changes
   $: if (!editingActive) {
      input = value.toString();
   }

   /**
    * Called when the input changes to ensure the input is valid before setting the value.
    */
   function parseInput() {
      // Get the new value front the inputted string.
      let newValue = isInteger ? parseInt(input) : parseFloat(input);

      // If the new value is not a number (such as if it is blank), set it to 0.
      if (isNaN(newValue)) {
         newValue = 0;
      }

      // Ensure the value is >= the minimum, if appropriate.
      if (min !== false) {
         newValue = Math.max(newValue, min);
      }

      // Ensure the value is <= the maximum, if appropriate.
      if (max !== false) {
         newValue = Math.min(newValue, max);
      }

      // If the value changed, broadcast the changed event.
      if (value !== newValue) {
         value = newValue;
         eventDispatcher('change');
      }
   }

   /**
    * Called when the key is pressed to ensure that invalid characters are not added to the input.
    * @param {object} event - The input event on the key press.
    */
   function filterInput(event) {
      if (!/[0-9\.,-]/.test(event.key)) {
         event.preventDefault();
      }
      else if (/[\.,]/.test(event.key)) {
         event.preventDefault();
      }
   }

   /**
    * Called when the input is focused. Sets editing active.
    */
   function onFocus() {
      editingActive = true;
   }

   /**
    * Called when the input is un-focused. Sets editing inactive.
    */
   function onBlur() {
      editingActive = false;
   }

   /**
    * Called when the input changes.
    */
   function onChange() {
      if (isNaN(isInteger ? parseInt(input) : parseFloat(input))) {
         input = value.toString();
      }
   }
</script>

<input
   bind:value={input}
   {disabled}
   on:blur={onBlur}
   on:blur
   on:change={onChange}
   on:focus={onFocus}
   on:focus
   on:keypress={(event) => filterInput(event)}
   on:keyup={parseInput}
   on:keyup
   type="number"
/>

<style lang="scss">
   input {
      @include input;
   }
</style>
