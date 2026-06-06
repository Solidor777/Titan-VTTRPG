<script>
   import { getContext } from 'svelte';
   import CharacterSheetEffectCheck
      from '~/document/types/actor/types/character/sheet/items/effect/CharacterSheetEffectCheck.svelte';

   /** @type {object} The embedded effect bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each document.data?.system.check ?? [] as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetEffectCheck {checkIdx}/>
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
