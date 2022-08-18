<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/DocumentIntegerInput.svelte";

   // The key / name of the Rating
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The mod data
   $: mod = $document.system.mod[key];

   // Map of icons to use for the mods
   const modIcons = {
      armor: "helmet-battle",
      damage: "bolt",
   };
   console.log($document.system.mod[key]);
</script>

<div class="mod">
   <!--Label-->
   <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}>
      <!--Icon-->
      <i class="fas fa-{modIcons[key]}" />
      {localize(`LOCAL.${key}.label`)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.baseValue.label`)}>
         {mod.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentIntegerInput bind:value={$document.system.mod[key].staticMod} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
         {mod.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

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
         font-size: 1rem;

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
            --input-border-radius: 10px;
         }
      }
   }
</style>
