<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} ExpandButtonProps
    * @property {boolean} [expanded] - Whether the button should currently be expanded.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    */

   /** @type {ExpandButtonProps} */
   let {
      expanded = $bindable(false),
      disabled = false,
      tooltip = void 0,
   } = $props();
</script>

<button
   {disabled}
   onclick={() => (expanded = !expanded)}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={expanded ? EXPANDED_ICON : COLLAPSED_ICON}></i>
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-font-size: var(--titan-expand-button-font-size);
      --titan-button-line-height: var(--titan-expand-button-line-height);
   }
</style>
