<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ResistanceButtonProps
    * @property {string} resistance - The Resistance that this component represents.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {((event: MouseEvent) => void) | undefined} [onclick] - Callback fired when the button is clicked.
    * @property {import('svelte').Snippet} [children] - Content to render inside the button.
    */

   /** @type {ResistanceButtonProps} */
   const {
      resistance,
      disabled = false,
      tooltip = void 0,
      onclick = void 0,
      children,
   } = $props();
</script>

<button class={resistance} {disabled} {onclick} onmousedown={preventDefault} use:tooltipAction={tooltip}>
   {@render children?.()}
</button>

<style lang="scss">
   button {
      @include button;
      @include resistance-button;
   }
</style>
