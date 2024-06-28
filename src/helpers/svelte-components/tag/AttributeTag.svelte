<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Attribute that this tag should be styled for. */
   export let attribute = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="tag {attribute}" use:tooltipAction={tooltip}>
   <slot/>
</div>

<style lang="scss">
   .tag {
      @include tag;

      &.body {
         --titan-tag-background: var(--titan-body-background);
      }

      &.mind {
         --titan-tag-background: var(--titan-mind-background);
      }

      &.soul {
         --titan-tag-background: var(--titan-soul-background);
      }
   }
</style>
