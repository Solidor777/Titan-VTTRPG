<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="tag" use:tooltipAction={tooltip}>
   <slot/>
</div>

<style lang="scss">
   .tag {
      @include tag;
   }
</style>
