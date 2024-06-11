<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   const document = getContext('document');

   // Chat context reference
   const titanFlags = $document.flags.titan;
</script>

<div class="traits">
   {#each titanFlags.system.traits as trait}
      <div class="trait">
         {localize(trait.name)}
         {#if typeof (trait.value) === 'number'}
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

         margin: var(--titan-padding-standard);
         padding: var(--titan-padding-standard);
         background: var(--titan-tag-background);
      }
   }
</style>
