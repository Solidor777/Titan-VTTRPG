<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ResistanceTagProps
    * @property {string} [resistance] - The Resistance to associate with the tag.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {ResistanceTagProps} */
   let { resistance = void 0, tooltip = void 0, children, testId = void 0 } = $props();
</script>

<div
   class="tag {resistance}"
   data-testid={testId}
   use:tooltipAction={tooltip}>
   {@render children?.()}
</div>

<style lang="scss">
   .tag {
      @include tag;

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
</style>
