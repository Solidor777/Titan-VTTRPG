<script>
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="stats">
   <!--Item Traits-->
   {#each $document.flags.titan.parameters.itemTrait as trait}
      <div class="stat" use:tooltip={{ content: trait.description }}>
         <Tag label={trait.name} />
      </div>
   {/each}
</div>

<style lang="scss">
   @import '../../../styles/mixins.scss';
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
