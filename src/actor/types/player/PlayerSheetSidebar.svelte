<script>
   import DocumentImagePicker from "~/documents/components/DocumentImagePicker.svelte";
   import CharacterSheetResources from "~/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte";
   import CharacterSheetMods from "~/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte";
   import CharacterSheetRatings from "~/actor/types/character/sheet/sidebar/CharacterSheetRatings.svelte";
   import CharacterSheetSpeeds from "~/actor/types/character/sheet/sidebar/CharacterSheetSpeeds.svelte";
   import IconButton from "~/helpers/svelte-components/button/IconButton.svelte";
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="portrait">
      <div class="image">
         <DocumentImagePicker path={"img"} alt={"character portrait"} />
      </div>
      <div class="button"><IconButton icon={"fas fa-campground"} /></div>
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
      @include panel-1;
      height: 100%;
      width: 100%;
      padding: 0.25rem;

      .portrait {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         position: relative;

         .image {
            width: 10rem;
            --border-style: none;
         }

         .button {
            position: absolute;
            top: 0;
            left: 0;
         }
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
