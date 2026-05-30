<script>
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   /**
    * @typedef {object} CharacterSheetWeaponAttacksProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetWeaponAttacksProps} */
   const { item = undefined } = $props();
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
            @include padding-top-large;

            margin-top: 8px;
         }
      }
   }
</style>
