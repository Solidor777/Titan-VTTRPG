<script>
   import evaluateMathExpression from '~/helpers/utility-functions/EvaluateMathExpression.js';
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

   /** @type {number} The committed value captured when editing begins; the base for relative-delta entries. */
   let editBaseValue = value;

   /** @type {string} The actual input from the user. */
   let input = $state(value.toString());

   // Update the display string whenever the bound value changes and editing is not active.
   $effect(() => {
      if (!editingActive) {
         input = value.toString();
      }
   });

   /**
    * Clamps a raw numeric result to the input's integer, min, max, and maxDigits constraints.
    * @param {number} raw - The unclamped numeric value.
    * @returns {number} The constrained value.
    */
   function clampValue(raw) {
      // Integer inputs round the result to the nearest whole number.
      let newValue = isInteger ? Math.round(raw) : raw;

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

      return newValue;
   }

   /**
    * Live-parses plain numeric input on each keystroke. Expressions (any input containing an
    * operator or parenthesis) are deferred to commit, so partial entries like "10+" are not coerced.
    * @returns {void}
    */
   function parseInput() {
      // Only plain non-negative numbers live-parse; anything with a leading operator (including a
      // leading minus, which is a relative delta) or an embedded operator waits for commit.
      if (!/^\d*\.?\d*$/.test(input.trim())) {
         return;
      }

      // Blank input resolves to 0, matching the previous behavior.
      let raw = isInteger ? parseInt(input) : parseFloat(input);
      if (isNaN(raw)) {
         raw = 0;
      }

      // Commit the clamped value and fire the change callback when it differs.
      const newValue = clampValue(raw);
      if (value !== newValue) {
         value = newValue;
         onchange?.();
      }
   }

   /**
    * Evaluates the raw input as a math expression and commits the result. Reverts the display to the
    * last committed value when the expression is malformed. Invoked on the change event and on Enter.
    * @returns {void}
    */
   function commitInput() {
      // Evaluate the expression, using the value captured at focus as the base for relative-delta
      // entries so live per-keystroke writes cannot corrupt it.
      const result = evaluateMathExpression(input, { currentValue: editBaseValue });

      // Malformed expressions revert the display to the committed value.
      if (result === null) {
         input = value.toString();
         return;
      }

      // Commit the clamped result and fire the change callback when it differs.
      const newValue = clampValue(result);
      if (value !== newValue) {
         value = newValue;
         onchange?.();
      }

      // Normalize the display and re-baseline so a further relative entry in the same focus session
      // (Enter commits without blurring) adjusts the freshly committed value.
      input = newValue.toString();
      editBaseValue = newValue;
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
      editBaseValue = value;
      onfocus?.(event);
   }

   /**
    * Called on each keypress to filter out characters that are not part of a math expression.
    * Only printable single-character keys are filtered; control keys (Enter, Backspace, arrows) pass.
    * @param {KeyboardEvent} event - The native keypress event.
    * @returns {void}
    */
   function filterInput(event) {
      if (event.key.length === 1 && !/[0-9.+\-*/() ]/.test(event.key)) {
         event.preventDefault();
      }
   }

   /**
    * Called on Enter to commit the expression without waiting for the input to blur.
    * @param {KeyboardEvent} event - The native keydown event.
    * @returns {void}
    */
   function handleKeydown(event) {
      if (event.key === 'Enter') {
         commitInput();
      }
   }

   /**
    * Called on each keyup event. Live-parses plain numbers and forwards the event to the consumer.
    * @param {KeyboardEvent} event - The native keyup event.
    * @returns {void}
    */
   function handleKeyup(event) {
      parseInput();
      onkeyup?.(event);
   }
</script>

<input bind:value={input}
       class={`titan-number-input ${maxDigits ? 'max-digits' : ''}`}
       data-testid={testId}
       {disabled}
       onblur={handleBlur}
       onchange={commitInput}
       onfocus={handleFocus}
       onkeydown={handleKeydown}
       onkeypress={filterInput}
       onkeyup={handleKeyup}
       style:--titan-max-digits={maxDigits ? maxDigits : 15}
       type="text"
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
