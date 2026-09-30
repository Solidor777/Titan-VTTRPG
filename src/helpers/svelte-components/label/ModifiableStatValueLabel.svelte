<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';
   import { getInnateModTotal } from '~/system/ModBuckets.js';

   /**
    * @typedef {object} ModifiableStatValueLabelProps
    * @property {number} [baseValue] - The base value of the stat before any modifiers are applied.
    * @property {number} [value] - The value of the stat after any modifiers are applied.
    * @property {number} [valueOverride] - Override for the value of the stat after any modifiers are applied.
    * @property {Record<string, number>} [mod] - The stat's modifier buckets (see MOD_BUCKET_LABELS).
    * @property {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
    * @property {string | undefined} [testId] - Optional data-testid for automated probing.
    */

   /** @type {ModifiableStatValueLabelProps} */
   let {
      baseValue = void 0,
      value = void 0,
      valueOverride = void 0,
      mod = void 0,
      baseTooltip = void 0,
      testId = void 0,
   } = $props();

   /**
    * The class to use for styling the label: a bonus or penalty when the value differs from the base plus the stat's
    * innate (ability and equipment) modifiers.
    * @type {string}
    */
   let styleClass = $derived.by(() => {
      /** @type {number} The stat's normal value. */
      const normalValue = baseValue + getInnateModTotal(mod);

      /** @type {number} The value compared against it. */
      const realValue = valueOverride ?? value;

      // Add a bonus class if normal value < current value.
      if (normalValue < realValue) {
         return 'label bonus';
      }

      // Add a penalty class if normal value > current value.
      if (normalValue > realValue) {
         return 'label penalty';
      }

      return 'label';
   });

   /**
    * The calculated tooltip for the stat, derived reactively from prop values.
    * @type {string}
    */
   let tooltip = $derived.by(() => createModifiableStatTooltip(
      baseValue,
      mod,
      valueOverride ? valueOverride - value : 0,
      baseTooltip,
   ));
</script>

<!--Total Value-->
<div
   class={styleClass}
   data-testid={testId}
   use:tooltipAction={{
      text: tooltip,
      localize: false,
   }}
>
   {value}
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
