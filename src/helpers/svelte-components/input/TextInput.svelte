<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} TextInputProps
    * @property {string} [value=undefined] - The value that this input should modify.
    * @property {boolean} [disabled=false] - Whether the input should currently be disabled.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    * @property {Function} [onchange] - Callback forwarded from the native change event.
    * @property {Function} [oninput] - Callback forwarded from the native input event.
    * @property {Function} [oncompositionend] - Callback forwarded from the native compositionend event.
    * @property {Function} [onfocus] - Callback forwarded from the native focus event.
    * @property {Function} [onblur] - Callback forwarded from the native blur event.
    * @property {Function} [onkeyup] - Callback forwarded from the native keyup event.
    * @property {string} [testId] - Optional stable selector applied as `data-testid`.
    */

   /** @type {TextInputProps} */
   let {
      value            = $bindable(),
      disabled         = false,
      tooltip          = undefined,
      onchange         = undefined,
      oninput          = undefined,
      oncompositionend = undefined,
      onfocus          = undefined,
      onblur           = undefined,
      onkeyup          = undefined,
      testId           = undefined,
   } = $props();
</script>

<input
   bind:value
   {disabled}
   {onchange}
   {oninput}
   {oncompositionend}
   {onfocus}
   {onblur}
   {onkeyup}
   data-testid={testId}
   use:tooltipAction={tooltip}
/>

<style lang="scss">
   input {
      @include input;
   }
</style>
