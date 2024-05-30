<script>
   import CharacterSheetResources
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetResources.svelte';
   import CharacterSheetMods from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetMods.svelte';
   import CharacterSheetRatings
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetRatings.svelte';
   import CharacterSheetSpeeds from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSpeeds.svelte';
   import CharacterSheetPortrait
      from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetPortrait.svelte';
</script>

<div class="sidebar">
   <!--Character Portrait-->
   <div class="section">
      <CharacterSheetPortrait/>
   </div>

   <!--Resources-->
   <div class="section">
      <CharacterSheetResources/>
   </div>

   <!--Ratings-->
   <div class="section">
      <CharacterSheetRatings/>
   </div>

   <!--Mods-->
   <div class="section">
      <CharacterSheetMods/>
   </div>

   <!--Speeds-->
   <div class="section">
      <CharacterSheetSpeeds/>
   </div>
</div>

<style lang="scss">
   .sidebar {
      @include border;
      @include flex-column;
      @include flex-group-top;
      @include panel-1;

      padding: var(--titan-padding-standard);
      min-width: 208px;

      .section {
         width: 100%;

         &:not(:first-child) {
            @include border-top;

            margin-top: var(--titan-padding-standard);
            padding-top: var(--titan-padding-standard);
         }
      }
   }
</style>
