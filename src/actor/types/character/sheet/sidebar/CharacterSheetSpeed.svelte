<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";
   import ModTag from "../../../../../helpers/svelte-components/tag/ModTag.svelte";

   // The key / name of the speed
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");
</script>

<!--Speeds-->
<div class="speed">
   <!--Label-->
   <div class="label" data-tooltip={localize(`${key}.desc`)}>
      <!--Icon-->
      {localize(`${key}`)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input" data-tooltip={localize(`${key}.editBaseValue`)}>
         <DocumentIntegerInput bind:value={$document.system.speed[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-tooltip={localize(`${key}.editStaticMod`)}>
         <DocumentIntegerInput bind:value={$document.system.speed[key].mod.static} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="value" data-tooltip={localize(`${key}.value`)}>
         <ModTag
            currentValue={$document.system.speed[key].value}
            baseValue={$document.system.speed[key].baseValue +
               $document.system.speed[key].mod.ability +
               $document.system.speed[key].mod.equipment}
         />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .speed {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      height: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
      }

      .value {
         @include flex-row;
         @include flex-group-center;
         min-width: 1.75rem;
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.25rem;
         }

         .input {
            width: 1.75rem;
         }
      }
   }
</style>
