<script>
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   // Reference to the weapon id
   export let item = void 0;
</script>

<!--Attacks list-->
<ol>
   <!--Each Attack-->
   {#each Object.keys(item.system.attack) as attackIdx}
      <li>
         <CharacterSheetWeaponAttack {attackIdx} {item}/>
      </li>
   {/each}
</ol>

<style lang="scss">
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
            padding-top: var(--padding-large);
            
            margin-top: 8px;
         }
      }
   }
</style>
