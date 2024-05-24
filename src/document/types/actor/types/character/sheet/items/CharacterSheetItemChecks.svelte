<script>

   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';

   /** @type TitanItem Reference to the Item document. */
   export let item = void 0;
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

            margin-top: var(--padding-standard);
            padding-top: var(--padding-standard);
         }
      }
   }
</style>
