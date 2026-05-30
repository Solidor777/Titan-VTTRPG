<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ButtonProps Props for the Button component.
    * @property {boolean} [disabled] - Whether the button is currently disabled.
    * @property {string | object | undefined} [tooltip] - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    * @property {import('svelte').Snippet | undefined} [children] - Default slot content.
    */

   /** @type {ButtonProps} */
   const {
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children = void 0,
   } = $props();
</script>

<button
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   {@render children?.()}
</button>

<style lang="scss">
   button {
      @include button;
   }
</style>
