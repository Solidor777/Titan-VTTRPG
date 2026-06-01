<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} RarityTagProps
    * @property {string} [rarity] - The rarity key (e.g. `'common'`, `'uncommon'`, `'rare'`, `'unique'`).
    * @property {string | TooltipAction} [tooltip] - The tooltip to display on hover, if any.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {RarityTagProps} */
   let { rarity = void 0, tooltip = void 0, testId = void 0 } = $props();
</script>

<div
   class="tag {rarity}"
   data-testid={testId}
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
