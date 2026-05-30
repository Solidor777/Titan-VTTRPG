<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ChatMessageButtonProps
    * @property {boolean} [disabled] Whether this button is disabled.
    * @property {string | object} [tooltip] The Tooltip to display for this element, if any.
    * @property {Function} [onclick] Click handler callback.
    * @property {import('svelte').Snippet} [children] Child content to render inside the button.
    */

   /** @type {ChatMessageButtonProps} */
   const { disabled = false, tooltip = void 0, onclick, children } = $props();
</script>

<button {disabled} {onclick} onmousedown={preventDefault} use:tooltipAction={tooltip}>
   {@render children?.()}
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-border-radius: var(--titan-button-border-radius);
   }
</style>
