<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {string|TooltipAction} The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="label" use:tooltipAction={tooltip}>
   <slot></slot>
</div>

<style lang="scss">
   .label {
      @include label;
   }
</style>
