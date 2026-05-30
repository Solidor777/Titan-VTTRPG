<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} TagProps
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    */

   /** @type {TagProps} */
   let { tooltip = void 0, children } = $props();
</script>

<div
   class="tag"
   use:tooltipAction={tooltip}
>
   {@render children?.()}
</div>

<style lang="scss">
   .tag {
      @include tag;
   }
</style>
