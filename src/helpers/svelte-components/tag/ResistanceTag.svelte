<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Resistance to associate with the tag. */
   export let resistance = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="tag {resistance}" use:tooltipAction={tooltip}>
   <slot/>
</div>

<style lang="scss">
   .tag {
      @include tag;

      @mixin resistance-colors {
         &.reflexes {
            --titan-tag-background: var(--titan-reflexes-background);
         }

         &.resilience {
            --titan-tag-background: var(--titan-resilience-background);
         }

         &.willpower {
            --titan-tag-background: var(--titan-willpower-background);
         }
      }
   }
</style>
