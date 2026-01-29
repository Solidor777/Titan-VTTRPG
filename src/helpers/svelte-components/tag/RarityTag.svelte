<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type string The Rarity to associate with the tag. */
   export let rarity = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;
</script>

<div class="tag {rarity}" use:tooltipAction={tooltip}>
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
