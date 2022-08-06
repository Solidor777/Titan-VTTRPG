<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "../../documents/components/DocumentIntegerInput.svelte";

   // The key / name of the speed
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The speed data
   $: speed = $document.system.speed[key];
</script>

<!--Speeds-->
<div class="speed">
   <!--Label-->
   <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}>
      <!--Icon-->
      {localize(`LOCAL.${key}.label`)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editBaseValue.label`)}>
         <DocumentIntegerInput bind:value={$document.system.speed[key].baseValue} />
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="input" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentIntegerInput bind:value={$document.system.speed[key].staticMod} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
         {speed.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .speed {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      height: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         font-size: 1rem;

         &.final {
            font-weight: bold;
         }
      }

      .stats {
         @include flex-row;
         @include flex-group-center;
         height: 100%;

         :not(:first-child) {
            margin-left: 0.5rem;
         }

         .input {
            width: 1.7rem;
            --input-border-radius: 10px;
         }
      }
   }
</style>
