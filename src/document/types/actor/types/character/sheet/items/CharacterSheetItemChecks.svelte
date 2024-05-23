<script>
   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';
   import {getContext} from "svelte";

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type {string} The ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type ItemCheckTemplate[] Calculated item reference. */
   let checks = [];

   // Update the Item in response to changes.
   $: {
      const item = $document.items.get(itemId);
      if (item) {
         checks = item.system.checks;
      }
   }
</script>

<!--Checks-->
<div class="checks">

   <!--Each Check-->
   {#each checks as check, checkIdx (check.uuid)}
      <div class="check">
         <CharacterSheetItemCheck {itemId} {checkIdx}/>
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
