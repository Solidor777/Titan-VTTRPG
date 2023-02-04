<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentIntegerInput from '~/documents/components/input/DocumentIntegerInput.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   // The key / name of the speed
   export let key;

   // The Character Data
   const document = getContext('DocumentStore');

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod
   ) {
      // Base label
      let retVal = `<p>${localize('base')}: ${baseValue}</p>`;

      // Equipment
      if (equipment !== 0) {
         retVal += `<p>${localize('equipment')}: ${equipment}</p>`;
      }

      // Abilities
      if (ability !== 0) {
         retVal += `<p>${localize('abilities')}: ${ability}</p>`;
      }

      // Effects
      if (effect !== 0) {
         retVal += `<p>${localize('effects')}: ${effect}</p>`;
      }

      // Static mod
      if (staticMod !== 0) {
         retVal += `<p>${localize('mod')}: ${staticMod}</p>`;
      }

      return retVal;
   }

   $: totalValueTooltip = getTotalValueTooltip(
      $document.system.speed[key].baseValue,
      $document.system.speed[key].mod.equipment,
      $document.system.speed[key].mod.effect,
      $document.system.speed[key].mod.ability,
      $document.system.speed[key].mod.static
   );
</script>

<!--Speeds-->
<div class="speed">
   <!--Label-->
   <div class="label" use:tooltip={{ content: localize(`${key}.desc`) }}>
      <!--Icon-->
      {localize(key)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.speed[key].baseValue}
         />
      </div>
      <div class="symbol">+</div>

      <!--Static Mod-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.speed[key].mod.static}
         />
      </div>
      <div class="symbol">=</div>

      <!--Total Value-->
      <div class="value" use:tooltip={{ content: totalValueTooltip }}>
         <ModTag
            currentValue={$document.system.speed[key].value}
            baseValue={$document.system.speed[key].baseValue +
               $document.system.speed[key].mod.ability +
               $document.system.speed[key].mod.equipment}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .speed {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      height: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;
         margin-left: 0.25rem;
         height: 100%;
      }

      .value {
         @include flex-row;
         @include flex-group-center;
         min-width: 1.75rem;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         .symbol {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
         }

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .input {
            width: 1.75rem;
         }
      }
   }
</style>
