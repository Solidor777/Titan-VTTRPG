<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import CharacterSheetResource from '~/actor/types/character/sheet/sidebar/CharacterSheetResource.svelte';

   // Setup context variables
   const document = getContext('DocumentStore');
</script>

<!--Resources-->
<div class="resources">
   <!--Each Resource Meter-->
   {#each Object.keys($document.system.resource) as key}
      {#if $document.system.resource[key].maxBase > 0}
         <div class="resource {key}" transition={key}>
            <CharacterSheetResource {key} />
         </div>
      {/if}
   {/each}
</div>

<style lang="scss">
   @import '../../../../../Styles/Mixins.scss';

   .resources {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .resource {
         @include flex-row;
         width: 100%;

         &:not(:first-child) {
            @include border-top;
            padding-top: 0.25rem;
            margin-top: 0.25rem;
         }
      }
   }
</style>
