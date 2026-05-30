<script>

   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';

   /**
    * @typedef {object} CharacterSheetItemChecksProps
    * @property {TitanItem} [item] Reference to the Item document.
    */

   /** @type {CharacterSheetItemChecksProps} */
   const { item = undefined } = $props();
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each item.system.check as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetItemCheck itemId={item._id} {checkIdx}/>
      </div>
   {/each}

</div>

<style lang="scss">
   .checks {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .check {
         @include flex-row;
         @include flex-group-center;

         width: 100%;

         &:not(:first-child) {
            @include border-top;
            @include margin-top-standard;
            @include padding-top-standard;
         }
      }
   }
</style>
