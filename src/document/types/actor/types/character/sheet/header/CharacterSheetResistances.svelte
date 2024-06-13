<script>
   import {getContext} from 'svelte';
   import CharacterSheetResistance
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetResistance.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="resistances">
   {#each Object.keys($document.system.resistance) as key}
      <div class="resistance">
         <CharacterSheetResistance bind:key/>
      </div>
   {/each}
</div>

<style lang="scss">
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

            padding-top: var(--titan-padding-standard);
            margin-top: var(--titan-padding-standard);
         }
      }
   }
</style>
