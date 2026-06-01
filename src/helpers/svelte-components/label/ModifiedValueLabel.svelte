<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';

   /**
    * @typedef {object} ModifiedValueLabelProps
    * @property {number} [baseValue] - The Base value of the stat before any modifiers are applied.
    * @property {number} [currentValue] - The Current value of the stat after modifiers are applied.
    * @property {string | TooltipAction} [tooltip] - The Tooltip to display for this element, if any.
    * @property {string | undefined} [testId] - Optional data-testid for automated probing.
    */

   /** @type {ModifiedValueLabelProps} */
   let { baseValue = void 0, currentValue = void 0, tooltip = void 0, testId = void 0 } = $props();

   /**
    * The class to use for styling the label, derived reactively from baseValue and currentValue.
    * @type {string}
    */
   let styleClass = $derived.by(() => {
      if (baseValue < currentValue) {
         return 'label bonus';
      }
      if (baseValue > currentValue) {
         return 'label penalty';
      }
      return 'label';
   });
</script>

<!--Total Value-->
<div class={styleClass} data-testid={testId} use:tooltipAction={tooltip}>
   {currentValue}
</div>

<style lang="scss">
   .label {
      @include bordered-label;

      --titan-label-height: var(--titan-input-height);
      --titan-label-padding: var(--titan-input-padding);

      &.bonus {
         --titan-label-font-color: var(--titan-greater-color);
         --titan-label-background: var(--titan-greater-background);
      }

      &.penalty {
         --titan-label-font-color: var(--titan-lesser-color);
         --titan-label-background: var(--titan-lesser-background);
      }
   }
</style>
