<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ResistanceTagProps
    * @property {string} [resistance] - The Resistance to associate with the tag.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {import('svelte').Snippet} [children] - Default slot content.
    */

   /** @type {ResistanceTagProps} */
   let { resistance = void 0, tooltip = void 0, children } = $props();
</script>

<div
   class="tag {resistance}"
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
