<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";

   // The key / name of the speed
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // The speed data
   $: speed = $document.system.speed[key];
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
      <div class="label final" data-tooltip={localize(`${key}.value`)}>
         {speed.value}
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
         @include font-size-normal;

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
