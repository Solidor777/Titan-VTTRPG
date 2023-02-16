<script>
   import { getContext } from 'svelte';
   import CharacterSheetAttribute from '~/actor/types/character/sheet/header/CharacterSheetAttribute.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
</script>

<!--Attributes-->
<div class="attributes">
   {#each Object.keys($document.system.attribute) as key}
      <div class="attribute">
         <CharacterSheetAttribute bind:key />
      </div>
   {/each}
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';
   .attributes {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .attribute {
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
