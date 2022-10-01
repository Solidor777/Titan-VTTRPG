<script>
   import { getContext } from "svelte";
   import CharacterSheetRating from "./CharacterSheetRating.svelte";

   // The Character Data
   const document = getContext("DocumentStore");

   // Map of icons to use for the ratings
   const ratingIcons = {
      awareness: "eye",
      defense: "shield",
      melee: "sword",
      accuracy: "bow-arrow",
      initiative: "clock",
   };
</script>

<div class="ratings">
   {#each Object.entries($document.system.rating) as [key]}
      <div class="rating">
         <CharacterSheetRating {key} icon={ratingIcons[key]} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .ratings {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .rating {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>
