<script>
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';

   /**
    * @typedef {object} ModifiableStatValueLabelProps
    * @property {number} [baseValue] - The base value of the stat before any modifiers are applied.
    * @property {number} [value] - The value of the stat after any modifiers are applied.
    * @property {number} [valueOverride] - Override for the value of the stat after any modifiers are applied.
    * @property {number} [abilityMod] - Bonuses and penalties from Abilities.
    * @property {number} [effectMod] - Bonuses and penalties from Effects.
    * @property {number} [equipmentMod] - Bonuses and penalties from Equipment.
    * @property {number} [staticMod] - Bonuses and penalties from Static modifiers.
    * @property {string} [baseTooltip] - Label for the base value of the stat in the tooltip.
    */

   /** @type {ModifiableStatValueLabelProps} */
   let {
      baseValue = void 0,
      value = void 0,
      valueOverride = void 0,
      abilityMod = void 0,
      effectMod = void 0,
      equipmentMod = void 0,
      staticMod = void 0,
      baseTooltip = void 0,
   } = $props();

   /**
    * The class to use for styling the label, derived reactively from prop values.
    * @type {string}
    */
   let styleClass = $derived.by(() => {
      // Calculate the normal value by adding the ability and equipment mods to the base value.
      let normalValue = baseValue;
      if (abilityMod) {
         normalValue += abilityMod;
      }
      if (equipmentMod) {
         normalValue += equipmentMod;
      }

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
      value,
      abilityMod,
      effectMod,
      equipmentMod,
      staticMod,
      valueOverride ? valueOverride - value : 0,
      baseTooltip
   ));
</script>

<!--Total Value-->
<div
   class={styleClass}
   use:tooltipAction={{
      text: tooltip,
      localize: false
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
