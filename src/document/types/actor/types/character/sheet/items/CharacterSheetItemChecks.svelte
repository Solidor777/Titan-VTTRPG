<script>
   import { getContext } from 'svelte';
   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each document.data?.system.check ?? [] as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetItemCheck {checkIdx}/>
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
