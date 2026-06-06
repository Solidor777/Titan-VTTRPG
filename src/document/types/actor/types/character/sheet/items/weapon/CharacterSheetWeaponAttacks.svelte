<script>
   import { getContext } from 'svelte';
   import EmbeddedDocumentProvider from '~/document/reactive/EmbeddedDocumentProvider.svelte';
   import CharacterSheetWeaponAttack
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttack.svelte';

   /**
    * @typedef {object} CharacterSheetWeaponAttacksProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetWeaponAttacksProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store (the actor bridge; outside the provider). */
   const document = getContext('document');

   /** @type {string[]} The Attack array indices, read reactively through document.data. */
   const attackKeys = $derived(Object.keys(document.data.items.get(item._id)?.system.attack ?? []));
</script>

<!--Attacks list: descendants read the embedded weapon as their 'document' context.-->
<EmbeddedDocumentProvider doc={item}>
   <ol>
      <!--Each Attack-->
      {#each attackKeys as attackIdx}
         <li>
            <CharacterSheetWeaponAttack attackIdx={Number(attackIdx)}/>
         </li>
      {/each}
   </ol>
</EmbeddedDocumentProvider>

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
