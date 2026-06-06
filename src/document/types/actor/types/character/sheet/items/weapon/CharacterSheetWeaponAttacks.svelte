<script>
   import { getContext } from 'svelte';
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   /** @type {object} The embedded weapon bridge provided by the list-level EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {string[]} The Attack array indices, read reactively through the embedded bridge. */
   const attackKeys = $derived(Object.keys(document.data?.system.attack ?? []));
</script>

<ol>
   <!--Each Attack-->
   {#each attackKeys as attackIdx}
      <li>
         <CharacterSheetWeaponAttack attackIdx={Number(attackIdx)}/>
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
