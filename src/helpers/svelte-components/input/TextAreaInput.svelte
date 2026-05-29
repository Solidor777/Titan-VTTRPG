<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} TextAreaInputProps
    * @property {string}        [value=undefined]   - The value that this input should modify.
    * @property {boolean}       [disabled=false]    - Whether the input should currently be disabled.
    * @property {string|object} [tooltip=undefined] - The Tooltip to display for this element, if any.
    * @property {Function}      [onchange]          - Callback forwarded from the native change event.
    */

   /** @type {TextAreaInputProps} */
   let {
      value    = $bindable(undefined),
      disabled = false,
      tooltip  = undefined,
      onchange = undefined,
   } = $props();
</script>

<textarea
   bind:value
   {disabled}
   {onchange}
   use:tooltipAction={tooltip}
/>

<style lang="scss">
   textarea {
      @include input;
      @include flex-row;
      @include flex-group-left;

      flex-wrap: wrap;
      width: 100%;
      height: 100%;
   }
</style>
