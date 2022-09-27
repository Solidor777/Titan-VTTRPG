<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import DocumentIntegerInput from "~/documents/components/input/DocumentIntegerInput.svelte";

   // The key / name of the Rating
   export let key;

   // The Character Data
   const document = getContext("DocumentStore");

   // The rating data
   $: rating = $document.system.rating[key];

   // Map of icons to use for the ratings
   const ratingIcons = {
      awareness: "eye",
      defense: "shield",
      melee: "sword",
      accuracy: "bow-arrow",
      initiative: "clock",
   };
</script>

<div class="rating">
   <!--Label-->
   <div class="label" data-tooltip={localize(`${key}.desc`)}>
      <!--Icon-->
      <i class="fas fa-{ratingIcons[key]}" />
      {localize(`${key}`)}
   </div>

   <!--Stats-->
   <div class="stats">
      <!--Base Value-->
      <div class="label" data-tooltip={localize(`${key}.baseValue`)}>
         {rating.baseValue}
      </div>
      <div class="label">+</div>

      <!--Static Mod-->
      <div class="static-mod" data-tooltip={localize(`${key}.editStaticMod`)}>
         <DocumentIntegerInput bind:value={$document.system.rating[key].staticMod} />
      </div>
      <div class="label">=</div>

      <!--Total Value-->
      <div class="label final" data-tooltip={localize(`${key}.value`)}>
         {rating.value}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .rating {
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
         @include font-size-normal;

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
