<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");

   // Calculate the tooltip for the max value
   function getTotalValueTooltip(equipment, effect) {
      // Base label
      let retVal = `<p>${localize("armor.max")}</p>`;

      // If the value has been modified
      if (maxValue !== maxBase) {
         // Base
         retVal += `<p>${localize("base")}: ${maxBase}</p>`;

         // Equipment Mod
         if (equipment !== 0) {
            retVal += `<p>${localize("equipment")}: ${equipment}</p>`;
         }

         // Effect Mod
         if (effect !== 0) {
            retVal += `<p>${localize("effects")}: ${effect}</p>`;
         }
      }
      return retVal;
   }
</script>

<div class="mod">
   <!--Label-->
   <div class="label" data-tooltip={localize("armor.desc")}>
      <!--Icon-->
      <i class="fas fa-helmet-battle" />
      {localize("armor")}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-tooltip={localize("armor.baseValue")}>
         {$document.system.mod.armor.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-tooltip={localize("armor.editStaticMod")}>
         <DocumentIntegerInput bind:value={$document.system.mod.armor.mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-tooltip={localize("armor.valie")}>
         {$document.system.mod.armor.value}
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
