<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import Meter from "~/helpers/svelte-components/Meter.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   // Resource key
   export let key;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(maxBase, equipment, effect, ability, staticMod) {
      // Base label
      let retVal = `<p>${localize(`${key}.max`)}</p><p>${localize("base")}: ${maxBase}</p>`;

      // Equipment
      if (equipment !== 0) {
         retVal += `<p>${localize("equipment")}: ${equipment}</p>`;
      }

      // Abilities
      if (ability !== 0) {
         retVal += `<p>${localize("abilities")}: ${ability}</p>`;
      }

      // Effects
      if (effect !== 0) {
         retVal += `<p>${localize("effects")}: ${effect}</p>`;
      }

      // Static mod
      if (staticMod !== 0) {
         retVal += `<p>${localize("mod")}: ${staticMod}</p>`;
      }

      return retVal;
   }

   $: totalValueTooltip = getTotalValueTooltip(
      $document.system.resource[key].maxBase,
      $document.system.resource[key].mod.equipment,
      $document.system.resource[key].mod.effect,
      $document.system.resource[key].mod.ability,
      $document.system.resource[key].mod.static
   );
</script>

<div class="resource">
   <!--Label row-->
   <div class="row">
      <div class="spacer" />

      <!--Label-->
      <span class="label" data-tooltip={localize(`${key}.valueDesc`)}>{localize(key)}</span>

      <!--Static Mod-->
      <div class="static-mod">
         <div class="symbol">+</div>
         <div class="input">
            <DocumentIntegerInput bind:value={$document.system.resource[key].mod.static} />
         </div>
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">
      <!--Current Value Input-->
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.resource[key].value} />
      </div>

      <!--The Meter-->
      <div class="meter {key}" data-tooltip={localize(`${key}.valueDesc`)}>
         <Meter current={$document.system.resource[key].value} max={$document.system.resource[key].max} />
      </div>

      <!--Max Value Display-->
      <div class="value" data-tooltip={totalValueTooltip}>
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
   @import "../../../../../Styles/Mixins.scss";

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
            margin-top: 0.25rem;
         }

         .label {
            @include flex-row;
            @include flex-group-center;
            font-weight: bold;
         }

         .static-mod {
            @include flex-row;
            @include flex-group-right;
            width: 2.75rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            width: 1.75rem;
         }

         .symbol {
            @include flex-row;
            margin-right: 0.25rem;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            min-width: 1.75rem;
         }

         .spacer {
            @include flex-row;
            width: 2.75rem;
         }

         .meter {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            flex: 1;
            width: 100%;

            &.stamina {
               --meter-color: var(--stamina-color);
            }

            &.wounds {
               --meter-color: var(--wounds-color);
            }

            &.resolve {
               --meter-color: var(--resolve-color);
            }
         }
      }
   }
</style>
