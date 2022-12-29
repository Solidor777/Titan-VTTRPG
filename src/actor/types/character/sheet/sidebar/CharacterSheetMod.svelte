<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import tooltip from "~/helpers/svelte-actions/Tooltip.js"
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";

   export let key = void 0;
   export let icon = void 0;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(equipment, effect, ability, staticMod) {
      // Base label
      let retVal = "";

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
      $document.system.mod[key].mod.equipment,
      $document.system.mod[key].mod.effect,
      $document.system.mod[key].mod.ability,
      $document.system.mod[key].mod.static
   );
</script>

<div class="mod">
   <!--Label-->
   <div class="label" use:tooltip={{content: localize(`${key}.desc`)}}>
      <!--Icon-->
      <i class="fas fa-{icon}" />
      {localize(key)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Static Mod-->
      <div class="label">+</div>
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.mod[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" use:tooltip={{content: totalValueTooltip}}>
         <ModTag
            currentValue={$document.system.mod[key].value}
            baseValue={$document.system.mod[key].mod.equipment + $document.system.mod[key].mod.ability}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .mod {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      height: 100%;

      i {
         width: 1.25rem;
      }

      .label {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         .fas {
            margin-right: 0.25rem;
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .input {
            @include flex-row;
            @include flex-group-center;
            width: 1.75rem;
         }

         .value {
            @include flex-row;
            @include flex-group-center;
            height: 100%;
            min-width: 1.75rem;
         }
      }
   }
</style>
