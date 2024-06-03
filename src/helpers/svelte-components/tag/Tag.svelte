<script>
   import tooltipAction from '~/helpers/svelte-actions/Tooltip.js';

   /** @type string Label to show for this element. */
   export let label = void 0;

   /** @type string Tooltip to display for this element, if any. */
   export let toolTip = void 0;
</script>

<div class="tag" use:tooltipAction={toolTip}>
   {label}
</div>

<style lang="scss">
   .tag {
      @include tag;
      @include label;
   }
</style>
