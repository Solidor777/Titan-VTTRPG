<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} CheckboxInputProps
    * @property {boolean} [value] - The boolean value to bind to.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {Function} [onchange] - Callback invoked after the value is toggled.
    */

   /** @type {CheckboxInputProps} */
   let {
      value = $bindable(false),
      disabled = false,
      tooltip = void 0,
      onchange = void 0,
   } = $props();

   /** Toggles the value and invokes the onchange callback. */
   function onClick() {
      value = !value;
      onchange?.();
   }
</script>

<button
   {disabled}
   onclick={onClick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}
>
   {#if value === true}
      <i class="fas fa-check"></i>
   {/if}
</button>

<style lang="scss">
   button {
      @include input;

      background: radial-gradient(var(--titan-input-background));
      height: var(--titan-input-height);
      margin: 0;
      min-height: var(--titan-input-height);
      min-width: var(--titan-input-height);
      padding: 0;
      width: var(--titan-input-height);
   }
</style>
