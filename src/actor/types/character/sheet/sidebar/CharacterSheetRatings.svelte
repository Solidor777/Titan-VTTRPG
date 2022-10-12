<script>
   import { getContext } from "svelte";
   import CharacterSheetRating from "./CharacterSheetRating.svelte";
   import CharacterSheetRatingButton from "./CharacterSheetRatingButton.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="ratings">
   <!--Awareness-->
   <div class="rating">
      <CharacterSheetRating key={"awareness"} icon={"eye"} />
   </div>

   <!--Defense-->
   <div class="rating">
      <CharacterSheetRating key={"defense"} icon={"shield"} />
   </div>

   <!--Melee-->
   <div class="rating">
      <CharacterSheetRating key={"melee"} icon={"sword"} />
   </div>

   <!--Accuracy-->
   <div class="rating">
      <CharacterSheetRating key={"accuracy"} icon={"bow-arrow"} />
   </div>

   <!--Initiative-->
   <div class="rating">
      <!-- svelte-ignore missing-declaration -->
      {#if game.settings.get("titan", "initiativeFormula") !== "flat"}
         <CharacterSheetRatingButton
            key={"initiative"}
            icon={"clock"}
            onClick={() => {
               $document.typeComponent.rollInitiative();
            }}
         />
      {:else}
         <CharacterSheetRating key={"initiative"} icon={"clock"} />
      {/if}
   </div>
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
