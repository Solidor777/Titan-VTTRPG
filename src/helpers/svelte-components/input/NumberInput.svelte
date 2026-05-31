<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} NumberInputProps
    * @property {number} [value=undefined] - The value that this input should modify.
    * @property {number|boolean} [min=false] - The minimum value of the input.
    * @property {number|boolean} [max=false] - The maximum value of the input.
    * @property {number|boolean} [maxDigits=false] - The maximum number of digits this input can display.
    * @property {boolean} [disabled=false] - Whether the input should currently be disabled.
    * @property {boolean} [isInteger=false] - Whether the input should be an Integer.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    * @property {Function} [onchange] - Callback fired after the value is committed.
    * @property {Function} [onblur] - Callback forwarded from the native blur event.
    * @property {Function} [onfocus] - Callback forwarded from the native focus event.
    * @property {Function} [onkeyup] - Callback forwarded from the native keyup event.
    * @property {string} [testId] - Optional stable selector applied as `data-testid`.
    */

   /** @type {NumberInputProps} */
   let {
      value     = $bindable(undefined),
      min       = false,
      max       = false,
      maxDigits = false,
      disabled  = false,
      isInteger = false,
      tooltip   = undefined,
      onchange  = undefined,
      onblur    = undefined,
      onfocus   = undefined,
      onkeyup   = undefined,
      testId    = undefined,
   } = $props();

   /** @type {boolean} Whether editing is currently active for the input. */
   let editingActive = $state(false);

   /** @type {string} The actual input from the user. */
   let input = $state(value.toString());

   // Update the display string whenever the bound value changes and editing is not active.
   $effect(() => {
      if (!editingActive) {
         input = value.toString();
      }
   });

   /**
    * Called when the input changes to ensure the input is valid before setting the value.
    * @returns {void}
    */
   function parseInput() {
      // Get the new value from the inputted string.
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

      // Ensure the value is <= the maximum digits, if appropriate.
      if (maxDigits !== false) {
         let stringValue = newValue.toString();
         let maxStringLength = stringValue.includes('.') ? maxDigits + 1 : maxDigits;
         if (stringValue.length > maxStringLength) {
            newValue = Number(stringValue.substring(0, maxStringLength));
         }
      }

      // If the value changed, update it and fire the change callback.
      if (value !== newValue) {
         value = newValue;
         onchange?.();
      }
   }

   /**
    * Called when the input element is blurred. Deactivates editing and forwards the event.
    * @param {FocusEvent} event - The native blur event.
    * @returns {void}
    */
   function handleBlur(event) {
      editingActive = false;
      onblur?.(event);
   }

   /**
    * Called when the input element is focused. Activates editing and forwards the event.
    * @param {FocusEvent} event - The native focus event.
    * @returns {void}
    */
   function handleFocus(event) {
      editingActive = true;
      onfocus?.(event);
   }

   /**
    * Called on each keypress to filter out non-numeric characters.
    * @param {KeyboardEvent} event - The native keypress event.
    * @returns {void}
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
    * Called when the native change event fires. Resets the display string if the raw input is not
    * a valid number.
    * @returns {void}
    */
   function handleChange() {
      if (isNaN(isInteger ? parseInt(input) : parseFloat(input))) {
         input = value.toString();
      }
   }

   /**
    * Called on each keyup event. Parses the input and forwards the event to the consumer.
    * @param {KeyboardEvent} event - The native keyup event.
    * @returns {void}
    */
   function handleKeyup(event) {
      parseInput();
      onkeyup?.(event);
   }
</script>

<input bind:value={input}
       class={`${maxDigits ? 'max-digits' : ''}`}
       data-testid={testId}
       {disabled}
       onblur={handleBlur}
       onchange={handleChange}
       onfocus={handleFocus}
       onkeypress={filterInput}
       onkeyup={handleKeyup}
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
