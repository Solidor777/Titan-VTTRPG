<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} AttributeTagProps
    * @property {string} [attribute] - The Attribute that this tag should be styled for.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    * @property {string} [testId] - Optional test identifier bound to `data-testid` on the root element.
    */

   /** @type {AttributeTagProps} */
   let { attribute = void 0, tooltip = void 0, children, testId = void 0 } = $props();
</script>

<div class="tag {attribute}" data-testid={testId} use:tooltipAction={tooltip}>
   {@render children?.()}
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
