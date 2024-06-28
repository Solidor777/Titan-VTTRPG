<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type string The Label to display for this element. */
   export let label = void 0;
</script>

<div class="tag" use:tooltipAction={tooltip}>
   {label}
</div>

<style lang="scss">
   .tag {
      @include tag;
   }
</style>
