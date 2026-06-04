<script>
   import { getContext } from 'svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<div class="stats">
   <!--Item Traits-->
   {#each document.data.system.parameters.customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
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
         @include tag-container-child-margin;
      }
   }
</style>
