<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type {{ rarity?: string, tooltip?: string | TooltipAction }} Props for this component. */
   let { rarity = void 0, tooltip = void 0 } = $props();
</script>

<div
   class="tag {rarity}"
   use:tooltipAction={tooltip}
>
   {localize(rarity)}
</div>

<style lang="scss">
   .tag {
      @include tag;

      &.uncommon {
         --titan-tag-background: var(--titan-uncommon-background);
      }

      &.rare {
         --titan-tag-background: var(--titan-rare-background);
      }

      &.unique {
         --titan-tag-background: var(--titan-unique-background);
      }
   }
</style>
