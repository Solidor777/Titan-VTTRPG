<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { COLLAPSED_ICON, EXPANDED_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} ExpandButtonProps
    * @property {boolean} [expanded] - Whether the button should currently be expanded.
    * @property {boolean} [disabled] - Whether the input should currently be disabled.
    * @property {string | object} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string | undefined} [testId] - Optional stable selector applied as `data-testid` on the button.
    */

   /** @type {ExpandButtonProps} */
   let {
      expanded = $bindable(),
      disabled = false,
      tooltip = void 0,
      testId = void 0,
   } = $props();

   /** @type {boolean} Whether the button shows expanded; an unbound `expanded` defaults to collapsed. */
   const isExpanded = $derived(expanded ?? false);
</script>

<button
   aria-label={isExpanded ? localize('collapse') : localize('expand')}
   data-testid={testId}
   {disabled}
   onclick={() => (expanded = !isExpanded)}
   onmousedown={preventDefault}
   use:tooltipAction={tooltip}>
   <i class={isExpanded ? EXPANDED_ICON : COLLAPSED_ICON}></i>
</button>

<style lang="scss">
   button {
      @include button;

      --titan-button-font-size: var(--titan-expand-button-font-size);
      --titan-button-line-height: var(--titan-expand-button-line-height);
   }
</style>
