<script>
   import CharacterSheetWeaponAttack from './CharacterSheetWeaponAttack.svelte';

   // Reference to the weapon id
   export let item = void 0;
</script>

<!--Attacks list-->
<ol>
   <!--Each Attack-->
   {#each Object.entries(item.system.attack) as [attackIdx]}
      <li>
         <CharacterSheetWeaponAttack {attackIdx} {item} />
      </li>
   {/each}
</ol>

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

   ol {
      @include flex-column;
      @include flex-group-top;
      @include list;
      width: 100%;

      li {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.5rem;
            margin-top: 0.55rem;
         }
      }
   }
</style>
