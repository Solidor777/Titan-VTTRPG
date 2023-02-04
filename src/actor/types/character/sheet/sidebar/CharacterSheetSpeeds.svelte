<script>
   import { getContext } from 'svelte';
   import CharacterSheetSpeed from '~/actor/types/character/sheet/sidebar/CharacterSheetSpeed.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
</script>

<!--Speeds-->
<div class="speeds">
   {#each Object.entries($document.system.speed) as [key]}
      <div class="speed">
         <CharacterSheetSpeed {key} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .speeds {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .speed {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            margin-top: 0.25rem;
            padding-top: 0.25rem;
         }
      }
   }
</style>
