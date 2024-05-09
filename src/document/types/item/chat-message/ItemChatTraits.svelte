<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   const document = getContext('document');

   // Chat context reference
   const chatContext = $document.flags.titan;
</script>

<div class="traits">
   {#each chatContext.system.traits as trait}
      <div class="trait">
         {localize(trait.name)}
         {#if trait.type === 'number'}
            {trait.value}
         {/if}
      </div>
   {/each}
</div>

<style lang="scss">
   .traits {
      @include flex-row;
      @include flex-group-center;
      @include border-top;
      width: 100%;
      flex-wrap: wrap;
      font-weight: bold;

      .trait {
         @include flex-row;
         @include flex-group-center;
         @include border;
         margin: var(--padding-standard);
         padding: var(--padding-standard);
         background: var(--label-background);
      }
   }
</style>
