<script>
   import CharacterSheetResources from '~/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte';
   import CharacterSheetMods from '~/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte';
   import CharacterSheetRatings from '~/actor/types/character/sheet/sidebar/CharacterSheetRatings.svelte';
   import CharacterSheetSpeeds from '~/actor/types/character/sheet/sidebar/CharacterSheetSpeeds.svelte';
   import CharacterSheetPortrait from '~/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte';
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="section">
      <CharacterSheetPortrait />
   </div>

   <!--Resources-->
   <div class="section">
      <CharacterSheetResources />
   </div>

   <!--Ratings-->
   <div class="section">
      <CharacterSheetRatings />
   </div>

   <!--Mods-->
   <div class="section">
      <CharacterSheetMods />
   </div>

   <!--Speeds-->
   <div class="section">
      <CharacterSheetSpeeds />
   </div>
</div>

<style lang="scss">
   @import '../../../Styles/Mixins.scss';

   .sidebar {
      @include border;
      @include flex-column;
      @include flex-group-top;
      @include panel-1;
      height: 100%;
      width: 100%;
      padding: 0.25rem;

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
</style>
