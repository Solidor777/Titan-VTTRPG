<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import ModTag from "~/helpers/svelte-components/tag/ModTag.svelte";
   import EfxButton from "../../../../../helpers/svelte-components/button/EfxButton.svelte";

   export let key = void 0;
   export let icon = void 0;
   export let onClick = void 0;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(baseValue, equipment, effect, ability, staticMod) {
      // Base label
      let retVal = `<p>${localize(`${key}.baseValue`)}</p><p>${localize("base")}: ${baseValue}</p>`;

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
      $document.system.rating[key].baseValue,
      $document.system.rating[key].mod.equipment,
      $document.system.rating[key].mod.effect,
      $document.system.rating[key].mod.ability,
      $document.system.rating[key].mod.static
   );
</script>

<div class="mod">
   <!--Button-->
   <!-- svelte-ignore a11y-missing-attribute -->
   <div class="button" data-tooltip={localize(`${key}.desc`)}>
      <EfxButton
         on:keypress={() => {
            onClick();
         }}
         on:click={() => {
            onClick();
         }}
      >
         <!--Icon-->
         <i class="fas fa-{icon}" />
         <div class="label">
            {localize(key)}
         </div>
      </EfxButton>
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Static Mod-->
      <div class="label">+</div>
      <div class="input">
         <DocumentIntegerInput bind:value={$document.system.rating[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" data-tooltip={totalValueTooltip}>
         <ModTag
            currentValue={$document.system.rating[key].value}
            baseValue={$document.system.rating[key].baseValue +
               $document.system.rating[key].mod.equipment +
               $document.system.rating[key].mod.ability}
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

      .button {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         --button-padding: 0 0;
         --button-line-height: 0;
         --button-font-weight: normal;

         .fas {
            margin-right: 0.25rem;
         }

         .label {
            margin-right: 0.5rem;
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
