<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type number The Base value of the stat before any modifiers are applied. */
   export let baseValue = void 0;

   /** @type number The Current value of the stat after modifiers are applied. */
   export let currentValue = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   // Calculate the class
   let tagClass = 'tag';
   if (baseValue < currentValue) {
      tagClass += ' greater';
   }
   else if (baseValue > currentValue) {
      tagClass += ' lesser';
   }
</script>

<!--Total Value-->
<div class={tagClass} use:tooltipAction={tooltip}>
   {currentValue}
</div>

<style lang="scss">
   .tag {
      @include tag;

      &.greater {
         --titan-tag-color: var(--titan-greater-color);
         --titan-tag-background: var(--titan-greater-background);
      }

      &.lesser {
         --titan-tag-color: var(--titan-lesser-color);
         --titan-tag-background: var(--titan-lesser-background);
      }
   }
</style>
