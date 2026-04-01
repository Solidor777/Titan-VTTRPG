<script>
   import { createEventDispatcher } from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {number} The value that this input should modify. */
   export let value = void 0;

   /** @type {number|boolean} The minimum value of the input. */
   export let min = false;

   /** @type {number|boolean} The maximum value of the input. */
   export let max = false;

   /** @type {number|boolean} The value digits this input can be. */
   export let maxDigits = false;

   /** @type {boolean} Whether the input should currently be disabled. */
   export let disabled = false;

   /** @type {boolean} Whether the input should be an Integer. If False, it will be a Float. */
   export let isInteger = false;

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type {boolean} Whether editing is currently active for the input. */
   let editingActive = false;

   /** @type {string} The actual input from the user. */
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

      // Ensure the value is <= the maximum digits if appropriate.
      if (maxDigits !== false) {
         let stringValue = newValue.toString();
         let maxStringLength = stringValue.includes('.') ? maxDigits + 1 : maxDigits;
         if (stringValue.length > maxStringLength) {
            newValue = Number(stringValue.substring(0, maxStringLength));
         }
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
      if (!/[0-9.,-]/.test(event.key)) {
         event.preventDefault();
      }
      else if (/[.,]/.test(event.key)) {
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

<input bind:value={input}
       class={`${maxDigits ? 'max-digits' : ''}`}
       {disabled}
       on:blur={onBlur}
       on:blur
       on:change={onChange}
       on:focus={onFocus}
       on:focus
       on:keypress={(event) => filterInput(event)}
       on:keyup={parseInput}
       on:keyup
       style:--titan-max-digits={maxDigits ? maxDigits : 15}
       type="number"
       use:tooltipAction={tooltip}
/>

<style lang="scss">
   input {
      --titan-input-text-alignment: center;

      &.max-digits {
         --titan-input-width: calc(var(--titan-input-digit-width) * var(--titan-max-digits) + 12px);
      }

      @include input;
   }
</style>
