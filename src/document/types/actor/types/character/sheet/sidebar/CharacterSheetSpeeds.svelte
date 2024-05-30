<script>
   import {getContext} from 'svelte';
   import CharacterSheetSpeed from '~/document/types/actor/types/character/sheet/sidebar/CharacterSheetSpeed.svelte';

   // Setup context variables
   const document = getContext('document');
</script>

<!--Speeds-->
<div class="speeds">
   {#each Object.keys($document.system.speed) as key}
      <div class="speed">
         <CharacterSheetSpeed {key}/>
      </div>
   {/each}
</div>

<style lang="scss">
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

            margin-top: var(--titan-padding-standard);
            padding-top: var(--titan-padding-standard);
         }
      }
   }
</style>
