<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} TagProps
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {TagProps} */
   let { tooltip = void 0, children, testId = void 0 } = $props();
</script>

<div
   class="tag"
   data-testid={testId}
   use:tooltipAction={tooltip}
>
   {@render children?.()}
</div>

<style lang="scss">
   .tag {
      @include tag;
   }
</style>
