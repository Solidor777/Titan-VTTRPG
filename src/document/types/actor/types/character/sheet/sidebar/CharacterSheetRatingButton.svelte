<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {getContext} from 'svelte';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import StatModLabel from '~/helpers/svelte-components/label/StatModLabel.svelte';

   export let key = void 0;
   export let icon = void 0;
   export let onClick = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   // Calculate the tooltipAction for the max value
   /**
    * @param baseValue
    * @param equipment
    * @param effect
    * @param ability
    * @param staticMod
    */
   function getTotalValueTooltip(
      baseValue,
      equipment,
      effect,
      ability,
      staticMod,
   ) {
      // Base label
      let retVal = `<p>${localize(`${key}.baseValue`)}</p><p>${localize(
         'base',
      )}: ${baseValue}</p>`;

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
      $document.system.rating[key].baseValue,
      $document.system.rating[key].mod.equipment,
      $document.system.rating[key].mod.effect,
      $document.system.rating[key].mod.ability,
      $document.system.rating[key].mod.static,
   );
</script>

<div class="mod">
   <!--Button-->
   <div class="button" use:tooltipAction="{localize(`${key}.desc`)}">
      <Button
         on:click={() => {
            onClick();
         }}
         on:keypress={() => {
            onClick();
         }}
      >
         <!--Icon-->
         <i class="{icon}"/>
         <div class="label">
            {localize(key)}
         </div>
      </Button>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Static Mod-->
      <div class="label">+</div>
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.rating[key].mod.static}
         />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value">
         <StatModLabel
            baseValue={$document.system.rating[key].baseValue +
               $document.system.rating[key].mod.equipment +
               $document.system.rating[key].mod.ability}
            currentValue={$document.system.rating[key].value}
            tooltip={totalValueTooltip}
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

      .button {
         @include flex-row;
         @include flex-group-center;

         height: 100%;

         --titan-button-padding: 2px;
         --titan-button-line-height: 20px;
         --titan-button-font-weight: normal;

         .fas {
            margin-right: var(--titan-padding-standard);
         }

         .label {
            margin-right: var(--titan-padding-large);
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
