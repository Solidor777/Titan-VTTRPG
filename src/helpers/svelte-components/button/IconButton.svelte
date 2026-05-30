<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} IconButtonProps Props for the IconButton component.
    * @property {string | undefined} [icon] - The icon class to display for this button.
    * @property {boolean} [disabled] - Whether this button is currently disabled.
    * @property {string} label - Accessible label for this icon-only button (required).
    * @property {string | object | undefined} [tooltip] - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    */

   /** @type {IconButtonProps} */
   const {
      icon = void 0,
      disabled = false,
      label,
      tooltip = void 0,
      onclick = void 0,
   } = $props();
</script>

<button
   aria-label={label}
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={icon}></i>
</button>

<style lang="scss">
   button {
      @include icon-button;

      i {
         margin-right: 0;
      }
   }
</style>
