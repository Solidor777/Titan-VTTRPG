<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   import DocumentTextInput from "~/documents/components/DocumentTextInput.svelte";

   // The key / name of the Rating
   export let key;

   // The Actor Data
   const document = getContext("DocumentSheetObject");

   // The rating data
   $: rating = $document.system.rating[key];

   // Map of icons to use for the ratings
   const ratingIcons = {
      awareness: "eye",
      defense: "shield",
      melee: "hand-fist",
      accuracy: "crosshairs",
      initiative: "clock",
   };
</script>

<!--Awarenesss-->
<div class="rating">
   <!--Label-->
   <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.desc.label`)}>
      <!--Icon-->
      <i class="fas fa-{ratingIcons[key]}" />
      {localize(`LOCAL.${key}.label`)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.baseValue.label`)}>
         {rating.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-titan-tooltip={localize(`LOCAL.${key}.editStaticMod.label`)}>
         <DocumentTextInput bind:value={$document.system.rating[key].staticMod} type="integer" />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label" data-titan-tooltip={localize(`LOCAL.${key}.value.label`)}>
         {rating.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../Styles/Mixins.scss";

   .rating {
      @include flex-row;
      @include flex-space-between;
      width: 100%;
      height: 100%;

      .label {
         @include flex-row;
         @include flex-group-center;
         height: 100%;
         font-weight: bold;
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
            width: 1.8rem;
            --border-radius-input: 10px;
         }
      }
   }
</style>
