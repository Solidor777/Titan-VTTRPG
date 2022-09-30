<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";

   // The key / name of the Rating
   export let key;

   // Icon to display
   export let icon = void 0;

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(equipment, effect) {
      // Base label
      let retVal = `<p>${localize(`${key}.max`)}</p>`;

      // If the value has been modified
      if (maxValue !== maxBase) {
         // Base
         retVal += `<p>Base: ${maxBase}</p>`;

         // Item Mod
         if (equipment !== 0) {
            retVal += `<p>Items: ${equipment}</p>`;
         }

         // Effect Mod
         if (effect !== 0) {
            retVal += `<p>Effects: ${effect}</p>`;
         }
      }
      return retVal;
   }
</script>

<div class="mod">
   <!--Label-->
   <div class="label" data-tooltip={localize(`${key}.desc`)}>
      <!--Icon-->
      <i class="fas fa-armor" />
      {localize(key)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-tooltip={localize(`${key}.baseValue`)}>
         {$document.system.mod[key].baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-tooltip={localize(`${key}.editStaticMod`)}>
         <DocumentIntegerInput bind:value={$document.system.mod[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-tooltip={localize(`${key}.value`)}>
         {$document.system.mod[key].value}
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

         &.final {
            font-weight: bold;
         }

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

         .static-mod {
            width: 1.7rem;
         }
      }
   }
</style>
