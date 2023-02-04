<script>
   import CharacterSheetMod from './CharacterSheetMod.svelte';
</script>

<div class="mods">
   <div class="mod">
      <CharacterSheetMod key={'armor'} icon={'helmet-battle'} />
   </div>

   <div class="mod">
      <CharacterSheetMod key={'damage'} icon={'burst'} />
   </div>

   <div class="mod">
      <CharacterSheetMod key={'healing'} icon={'heart'} />
   </div>
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .mods {
      @include flex-column;
      @include flex-group-top;
      width: 100%;
      height: 100%;

      .mod {
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
