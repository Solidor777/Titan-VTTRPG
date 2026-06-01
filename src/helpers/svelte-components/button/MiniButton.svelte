<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} MiniButtonProps Props for the MiniButton component.
    * @property {boolean} [disabled] - Whether the button is currently disabled.
    * @property {string | object | undefined} [tooltip] - The tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback invoked when the button is clicked.
    * @property {import('svelte').Snippet | undefined} [children] - Default slot content.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the button.
    */

   /** @type {MiniButtonProps} */
   const {
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children = void 0,
      testId = void 0,
   } = $props();
</script>

<button
   data-testid={testId}
   {disabled}
   {onclick}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   {@render children?.()}
</button>

<style lang="scss">
   button {
      @include mini-button;
   }
</style>

