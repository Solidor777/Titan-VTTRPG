<script>
   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';
   // Reference to the item
   export let item = void 0;

   // Item reference
   $: checks = item.system.check;
</script>

<!--Checks-->
{#if checks.length > 0}
   <div class="checks">
      <!--Each Check-->
      {#each checks as check, checkIdx}
         <div class="check">
            <CharacterSheetItemCheck {item} {checkIdx}/>
         </div>
      {/each}
   </div>
{/if}

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
