<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import Meter from "~/helpers/svelte-components/Meter.svelte";

   // Resource key
   export let key;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(maxValue, maxBase, equipment, effect, ability) {
      // Base label
      let retVal = `<p>${localize(`${key}.max`)}</p>`;

      // Base
      retVal += `<p>${localize("base")}: ${maxBase}</p>`;

      // Abilities
      if (ability !== 0) {
         retVal += `<p>${localize("abilities")}: ${ability}</p>`;
      }

      // Equipment
      if (equipment !== 0) {
         retVal += `<p>${localize("equipment")}: ${equipment}</p>`;
      }

      // Effects
      if (effect !== 0) {
         retVal += `<p>${localize("effects")}: ${effect}</p>`;
      }

      return retVal;
   }

   function getModClass(effect, staticMod) {
      if (effect + staticMod === 0) {
         return "";
      } else {
         return effect + staticMod > 0 ? "greater" : "lesser";
      }
   }

   $: totalValueTooltip = getTotalValueTooltip(
      $document.system.resource[key].maxValue,
      $document.system.resource[key].maxBase,
      $document.system.resource[key].mod.equipment,
      $document.system.resource[key].mod.effect,
      $document.system.resource[key].mod.ability
   );

   $: modClass = getModClass($document.system.resource[key].mod.effect, $document.system.resource[key].mod.static);
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
         <div class="input" data-tooltip={localize(`${key}.editStaticMod`)}>
            <DocumentIntegerInput bind:value={$document.system.resource[key].mod.static} />
         </div>
      </div>
   </div>

   <!--Meter bar row-->
   <div class="row">
      <!--Current Value Input-->
      <div class="input" data-tooltip={localize(`${key}.editValue`)}>
         <DocumentIntegerInput bind:value={$document.system.resource[key].value} />
      </div>

      <!--The Meter-->
      <div class="meter {key}" data-tooltip={localize(`${key}.valueDesc`)}>
         <Meter current={$document.system.resource[key].value} max={$document.system.resource[key].maxValue} />
      </div>

      <!--Max Value Display-->
      <div class="static-value {modClass}" data-tooltip={totalValueTooltip}>
         {$document.system.resource[key].maxValue}
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

         .static-value {
            @include border;
            @include static-value;
            @include mod-colors;
            height: 100%;
            width: 1.75rem;
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
               --meter-color: var(--stamina-color-dark);
            }

            &.wounds {
               --meter-color: var(--wounds-color-dark);
            }

            &.resolve {
               --meter-color: var(--resolve-color-dark);
            }
         }
      }
   }
</style>
