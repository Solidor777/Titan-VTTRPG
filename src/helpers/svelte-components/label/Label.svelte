<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} LabelProps
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    */

   /** @type {LabelProps} */
   let { tooltip = void 0, children } = $props();
</script>

<div class="label" use:tooltipAction={tooltip}>
   {@render children?.()}
</div>

<style lang="scss">
   .label {
      @include label;
   }
</style>
