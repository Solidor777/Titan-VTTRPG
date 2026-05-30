<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} AttributeTagProps
    * @property {string} [attribute] - The Attribute that this tag should be styled for.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    */

   /** @type {AttributeTagProps} */
   let { attribute = void 0, tooltip = void 0, children } = $props();
</script>

<div class="tag {attribute}" use:tooltipAction={tooltip}>
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
