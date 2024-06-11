<script>
   import {getContext} from 'svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Document reference
   const document = getContext('document');
</script>

<div class="stats">
   <!--Item Traits-->
   {#each $document.flags.titan.parameters.itemTrait as trait}
      <div class="stat">
         <Tag tooltip={trait.description}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include flex-row;
      @include flex-group-center;

      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-margin;
      }
   }
</style>
