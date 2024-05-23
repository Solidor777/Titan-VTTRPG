<script>
   import { getContext } from 'svelte';
   import CharacterSheetAttribute
      from '~/document/types/actor/types/character/sheet/header/CharacterSheetAttribute.svelte';

   // Setup context variables
   const document = getContext('document');
</script>

<!--Attributes-->
<div class="attributes">
   {#each Object.keys($document.system.attribute) as key}
      <div class="attribute">
         <CharacterSheetAttribute bind:key/>
      </div>
   {/each}
</div>

<style lang="scss">
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

            padding-top: var(--padding-standard);
            margin-top: var(--padding-standard);
         }
      }
   }
</style>
