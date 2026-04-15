<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import createModifiableStatTooltip from '~/helpers/utility-functions/CreateModifiableStatTooltip.js';

   /** @type {number} The base value of the stat before any modifiers are applied. */
   export let baseValue = void 0;

   /** @type {number} The value of the stat after any modifiers are applied. */
   export let value = void 0;

   /** @type {number} Override for the value of the stat after any modifiers are applied. */
   export let valueOverride = void 0;

   /** @type {number} Bonuses and penalties from Abilities. */
   export let abilityMod = void 0;

   /** @type {number} Bonuses and penalties from Effects. */
   export let effectMod = void 0;

   /** @type {number} Bonuses and penalties from Equipment. */
   export let equipmentMod = void 0;

   /** @type {number} Bonuses and penalties from Static modifiers. */
   export let staticMod = void 0;

   /** @type {string} Label for the base value of the stat in the tooltip. */
   export let baseTooltip = void 0;

   /** @type {string} Calculated tooltip for the stat. */
   let tooltip = `<p>${baseTooltip ?? localize('base')}: ${baseValue}</p>`;

   /** @type {string} Calculated class to use for styling the label. */
   let styleClass = 'label';

   $: {
      // Calculate the normal value by adding the ability and equipment mods to
      // the base value.
      let normalValue = baseValue;
      if (abilityMod) {
         normalValue += abilityMod;
      }
      if (equipmentMod) {
         normalValue += equipmentMod;
      }

      let realValue = valueOverride ?? value;

      // Update the style class in response to changes.
      styleClass = 'label';

      // Add a bonus class if normal value < current value.
      if (normalValue < realValue) {
         styleClass += ' bonus';
      }

      // Add a penalty class if normal value > current value.
      else if (normalValue > realValue) {
         styleClass += ' penalty';
      }

      // Update the tooltip in response to changes.
      tooltip = createModifiableStatTooltip(
         baseValue,
         value,
         abilityMod,
         effectMod,
         equipmentMod,
         staticMod,
         valueOverride ? valueOverride - value : 0,
         baseTooltip
      );
   }
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
