<script>
   import { getContext } from 'svelte';
   import ExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="effects">
   <!--Expired Effects-->
   {#if document.data.system.effects.expired}
      {#each document.data.system.effects.expired as effect}
         <div class="effect">
            <ExpiredEffectTag
               {effect}
            />
         </div>
      {/each}
   {/if}
</div>

<style lang="scss">
   .effects {
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .effect {
         @include tag-container-child-margin;
      }
   }
</style>
