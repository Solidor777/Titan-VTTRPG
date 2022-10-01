<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import CharacterSheetResistance from "~/actor/types/character/sheet/header/CharacterSheetResistance.svelte";

   // Setup context variables
   const document = getContext("DocumentStore");
</script>

<div class="resistances">
   {#each Object.entries($document.system.resistance) as [key]}
      <div class="resistance">
         <CharacterSheetResistance bind:key />
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../../../Styles/Mixins.scss";

   .resistances {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .resistance {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
         }
      }
   }
</style>
