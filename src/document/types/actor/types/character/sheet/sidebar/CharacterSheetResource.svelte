<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import DocumentIntegerInput from '~/document/svelte-components/input/DocumentIntegerInput.svelte';
   import Meter from '~/helpers/svelte-components/Meter.svelte';
   import ModifiableStatValueLabel from '~/helpers/svelte-components/label/ModifiableStatValueLabel.svelte';
   import { getIcon } from '~/system/Icons.js';

   /**
    * @typedef {object} CharacterSheetResourceProps
    * @property {string} [resource] The Resource that this component represents.
    * @property {string} [icon] The Icon that represents this stat.
    */

   /** @type {CharacterSheetResourceProps} */
   const { resource = undefined, icon = getIcon(resource) } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="container">
   <!--Label Row-->
   <div class="row">

      <!--Icon-->
      <i class={`${icon} side`}></i>

      <!--Label-->
      <div class="middle" use:tooltipAction={`${resource}.desc`}>

         <!--Spacer to center the label-->
         <div class="side"></div>

         <!--Label-->
         <div class="label">
            {localize(resource)}
         </div>

         <!--Plus Sign-->
         <div class=" side">+</div>
      </div>

      <!--Static Mod-->
      <div class="side">
         <DocumentIntegerInput
            bind:value={$document.system.resource[resource].mod.static}
         />
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">

      <!--Current Value Input-->
      <div class="side">
         <DocumentIntegerInput
            bind:value={$document.system.resource[resource].value}
         />
      </div>

      <!--Meter-->
      <div
         class="middle {resource} "
         use:tooltipAction={`${resource}.desc`}
      >
         <Meter
            max={$document.system.resource[resource].max}
            value={$document.system.resource[resource].value}
         />
      </div>

      <!--Max Value-->
      <div class="side">
         <ModifiableStatValueLabel
            abilityMod={$document.system.resource[resource].mod.ability}
            baseTooltip={localize(`${resource}.maxValue`)}
            baseValue={$document.system.resource[resource].maxBase}
            effectMod={$document.system.resource[resource].mod.effect}
            equipmentMod={$document.system.resource[resource].mod.equipment}
            staticMod={$document.system.resource[resource].mod.static}
            value={$document.system.resource[resource].max}
         />
      </div>
   </div>
</div>

<style lang="scss">
   .container {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
      height: 100%;

      .row {
         @include flex-row;
         @include flex-space-between;

         width: 100%;
         height: 100%;

         &:not(:first-child) {
            @include margin-top-standard;
         }

         .side {
            @include flex-group-center;
            @include flex-row;

            width: 28px;
         }

         .middle {
            @include flex-row;
            @include flex-space-between;

            height: 100%;
            width: 100%;
            flex: 1;

            &.resolve {
               --titan-meter-color: var(--titan-resolve-background);
            }

            &.stamina {
               --titan-meter-color: var(--titan-stamina-background);
            }

            &.wounds {
               --titan-meter-color: var(--titan-wounds-background);
            }
         }
      }
   }
</style>
