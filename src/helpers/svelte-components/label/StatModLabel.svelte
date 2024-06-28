<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /** @type number The Base value of the stat before any modifiers are applied. */
   export let baseValue = void 0;

   /** @type number The Current value of the stat after modifiers are applied. */
   export let currentValue = void 0;

   /** @type string The Tooltip to display for this element, if any. */
   export let tooltip = void 0;

   /** @type string The class to use for styling the label. */
   let styleClass = 'label';

   // Adjust the style class, depending on whether this stat has been modified.
   if (baseValue < currentValue) {
      styleClass += ' bonus';
   }
   else if (baseValue > currentValue) {
      styleClass += ' penalty';
   }
</script>

<!--Total Value-->
<div class={styleClass} use:tooltipAction={tooltip}>
   {currentValue}
</div>

<style lang="scss">
   .label {
      @include label;

      &.bonus {
         --titan-tag-color: var(--titan-greater-color);
         --titan-tag-background: var(--titan-greater-background);
      }

      &.penalty {
         --titan-tag-color: var(--titan-lesser-color);
         --titan-tag-background: var(--titan-lesser-background);
      }
   }
</style>
