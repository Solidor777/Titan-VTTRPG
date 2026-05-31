<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {{ tooltip?: string | TooltipAction, label?: string, testId?: string }} Props for this component. */
   let { tooltip = void 0, label = void 0, testId = void 0 } = $props();
</script>

<div class="tag" data-testid={testId} use:tooltipAction={tooltip}>
   {label}
</div>

<style lang="scss">
   .tag {
      @include tag;
   }
</style>
