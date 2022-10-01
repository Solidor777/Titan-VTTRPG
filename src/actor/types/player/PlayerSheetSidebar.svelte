<script>
   import { getContext } from "svelte";
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import CharacterSheetResources from "~/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte";
   import CharacterSheetMods from "~/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte";
   import CharacterSheetRatings from "~/actor/types/character/sheet/sidebar/CharacterSheetRatings.svelte";
   import CharacterSheetSpeeds from "../character/sheet/sidebar/CharacterSheetSpeeds.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="portrait">
      <DocumentImagePicker path={"img"} alt={"character portrait"} />
   </div>

   <div class="sections">
      <!--Resources-->
      <div class="section">
         <CharacterSheetResources />
      </div>

      <!--Mods-->
      <div class="section">
         <CharacterSheetMods />
      </div>

      <!--Ratings-->
      <div class="section">
         <CharacterSheetRatings />
      </div>

      <!--Speeds-->
      <div class="section">
         <CharacterSheetSpeeds />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .sidebar {
      @include border;
      @include flex-column;
      @include flex-group-top;
      @include panel-2;
      height: 100%;
      width: 100%;
      padding: 0.25rem;

      .portrait {
         width: 10rem;
         --border-style: none;
      }

      .sections {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         .section {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.25rem;
               padding-top: 0.25rem;
            }
         }
      }
   }
</style>
