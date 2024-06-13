<script>
   import {getContext} from 'svelte';
   import ChatExpiredEffectTag from '~/helpers/svelte-components/tag/effects/ExpiredEffectTag.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
</script>

<div class="effects">
   <!--Expired Effects-->
   {#each $document.flags.titan.effects.expired as effect}
      <div class="effect">
         <ChatExpiredEffectTag
            label={effect.label}
            img={effect.img}
            description={effect.description}
         />
      </div>
   {/each}
</div>

<style lang="scss">
   .effects {
      @include flex-row;
      @include flex-group-center;

      flex-wrap: wrap;

      .effect {
         @include tag-margin;
      }
   }
</style>
