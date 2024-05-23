<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import DocumentIntegerInput from '~/document/components/input/DocumentIntegerInput.svelte';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
   import ModTag from '~/helpers/svelte-components/tag/ModTag.svelte';

   // Resource key
   export let key = void 0;
   export let icon = void 0;
   export let resourceTooltip = void 0;

   // Setup context variables
   const document = getContext('document');

   // Calculate the tooltip for the max value
   /**
    * @param maxBase
    * @param equipment
    * @param effect
    * @param ability
    * @param staticMod
    */
   function getTotalValueTooltip(
      maxBase,
      equipment,
      effect,
      ability,
      staticMod,
   ) {
      // Base label
      let retVal = `<p>${resourceTooltip}</p><p>${localize(
         'base',
      )}: ${maxBase}</p>`;

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
      $document.system.resource[key].maxBase,
      $document.system.resource[key].mod.equipment,
      $document.system.resource[key].mod.effect,
      $document.system.resource[key].mod.ability,
      $document.system.resource[key].mod.static,
   );
</script>

<div class="resource">
   <!--Label row-->
   <div class="row">
      <div class="spacer">
         <i class={icon}/>
      </div>

      <!--Label-->
      <span class="label" use:tooltip={{ content: localize(`${key}.desc`) }}
      >{localize(key)}</span
      >

      <!--Static Mod-->
      <div class="static-mod">
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput
               bind:value={$document.system.resource[key].mod.static}
            />
         </div>
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">
      <!--Current Value Input-->
      <div class="input">
         <DocumentIntegerInput
            bind:value={$document.system.resource[key].value}
         />
      </div>

      <!--The Meter-->
      <div
         class="meter {key}"
         use:tooltip={{ content: localize(`${key}.desc`) }}
      >
         <Meter
            current={$document.system.resource[key].value}
            max={$document.system.resource[key].max}
         />
      </div>

      <!--Max Value Display-->
      <div class="value" use:tooltip={{ content: totalValueTooltip }}>
         <ModTag
            baseValue={$document.system.resource[key].maxBase +
               $document.system.resource[key].mod.equipment +
               $document.system.resource[key].mod.ability}
            currentValue={$document.system.resource[key].max}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .resource {
      @include flex-column;
      @include flex-group-top;

      box-sizing: border-box;
      width: 100%;
      height: 100%;

      .row {
         @include flex-row;
         @include flex-space-between;

         width: 100%;
         height: 100%;

         &:not(:first-child) {
            margin-top: var(--padding-standard);
         }

         .label {
            @include flex-row;
            @include flex-group-center;

            font-weight: bold;
         }

         .static-mod {
            @include flex-row;
            @include flex-group-right;

            width: 44px;
         }

         .input {
            @include flex-row;
            @include flex-group-center;

            width: 28px;
         }

         .symbol {
            @include flex-row;

            margin-right: var(--padding-standard);
         }

         .value {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            min-width: 28px;
         }

         .spacer {
            @include flex-row;

            width: 44px;

            i {
               margin-left: 6px;
            }
         }

         .meter {
            @include flex-row;
            @include flex-group-center;

            height: 100%;
            flex: 1;
            width: 100%;
         }
      }
   }
</style>
