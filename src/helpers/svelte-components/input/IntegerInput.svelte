<script>
   import NumberInput from '~/helpers/svelte-components/input/NumberInput.svelte';

   /**
    * @typedef {object} IntegerInputProps
    * @property {number} [value=undefined] - The value that this input should modify.
    * @property {number|boolean} [min=false] - The minimum value of the input, or false for no minimum.
    * @property {number|boolean} [max=false] - The maximum value of the input, or false for no maximum.
    * @property {number|boolean} [maxDigits=false] - The maximum number of digits this input can display.
    * @property {boolean} [disabled=false] - Whether the input should currently be disabled.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    * @property {Function} [onchange] - Callback forwarded from the native change event.
    * @property {Function} [onkeyup] - Callback forwarded from the native keyup event.
    */

   /** @type {IntegerInputProps} */
   let {
      value     = $bindable(undefined),
      min       = false,
      max       = false,
      maxDigits = false,
      disabled  = false,
      tooltip   = undefined,
      onchange  = undefined,
      onkeyup   = undefined,
   } = $props();
</script>

<NumberInput
   bind:value
   {disabled}
   isInteger={true}
   {max}
   {maxDigits}
   {min}
   {onchange}
   {onkeyup}
   {tooltip}
/>
