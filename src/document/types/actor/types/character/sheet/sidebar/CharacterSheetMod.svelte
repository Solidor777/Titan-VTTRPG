<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   export let key = void 0;
   export let icon = void 0;

   // Setup context variables
   const document = getContext('document');

   // Calculate the tooltip for the max value
   /**
    * @param equipment
    * @param effect
    * @param ability
    * @param staticMod
    */
   function getTotalValueTooltip(equipment, effect, ability, staticMod) {
      // Base label
      let retVal = '';

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
      $document.system.mod[key].mod.equipment,
      $document.system.mod[key].mod.effect,
      $document.system.mod[key].mod.ability,
      $document.system.mod[key].mod.static,
   );
</script>

<div class="mod">
   <!--Label-->
   <div class="label" use:tooltip={{ content: localize(`${key}.desc`) }}>
      <!--Icon-->
      <i class="{icon}"/>
      {localize(key)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Static Mod-->
      <div class="label">+</div>
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.mod[key].mod.static}
         />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" use:tooltip={{ content: totalValueTooltip }}>
         <ModTag
            baseValue={$document.system.mod[key].mod.equipment +
               $document.system.mod[key].mod.ability}
            currentValue={$document.system.mod[key].value}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .mod {
      @include flex-row;
      @include flex-space-between;

      width: 100%;
      height: 100%;

      i {
         width: 20px;
      }

      .label {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         .fas {
            margin-right: var(--titan-padding-standard);
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         :not(:first-child) {
            margin-left: var(--titan-padding-standard);
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            width: 28px;
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            min-width: 28px;
         }
      }
   }
</style>
