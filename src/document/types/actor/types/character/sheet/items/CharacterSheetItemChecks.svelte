<script>
   import CharacterSheetItemCheck
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemCheck.svelte';
   import {getContext} from "svelte";

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   /** @type {string} The ID of the item. */
   export let itemId = void 0;

   /** @type TitanItem Calculated item reference. */
   let item;


   // Update the Item in response to changes.
   $: {
      item = $document.items.get(itemId);
   }
</script>

<!--Checks-->
{#if item && item.system.check.length > 0}
   <div class="checks">
      <!--Each Check-->
      {#each item.system.check as check, checkIdx}
         <div class="check">
            <CharacterSheetItemCheck {itemId} {checkIdx}/>
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
