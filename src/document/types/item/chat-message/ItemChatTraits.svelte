<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // Chat-message system snapshot reference.
   const system = document.data.system;
</script>

<div class="traits">
   {#each system.trait as trait}
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

         margin: var(--titan-spacing-standard);

         @include padding-large;

         background: var(--titan-tag-background);
      }
   }
</style>
