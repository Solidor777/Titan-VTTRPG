<script>
   import CharacterSheetMod from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetMod.svelte';
   import {ARMOR_ICON, DAMAGE_ICON, HEALING_ICON} from '~/system/Icons.js';
</script>

<div class="mods">
   <div class="mod">
      <CharacterSheetMod icon={ARMOR_ICON} key={'armor'}/>
   </div>

   <div class="mod">
      <CharacterSheetMod icon={DAMAGE_ICON} key={'damage'}/>
   </div>

   <div class="mod">
      <CharacterSheetMod icon={HEALING_ICON} key={'healing'}/>
   </div>
</div>

<style lang="scss">
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

            margin-top: var(--titan-padding-standard);
            padding-top: var(--titan-padding-standard);
         }
      }
   }
</style>
