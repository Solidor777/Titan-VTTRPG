<script>
   import { localize } from '~/helpers/Utility.js';
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Document reference
   const document = getContext('DocumentStore');
</script>

<div class="stats">
   <!--Type-->
   <div class="stat">
      <IconTag
         icon={$document.flags.titan.chatContext.parameters.type === 'melee'
            ? 'fas fa-sword'
            : 'fas fa-bow-arrow'}
         label={localize($document.flags.titan.chatContext.parameters.type)}
      />
   </div>

   <!--Range-->
   {#if $document.flags.titan.chatContext.parameters.attack.range !== 1}
      <div class="stat">
         <IconStatTag
            label={localize('range')}
            value={$document.flags.titan.chatContext.parameters.attack.range}
            icon={'fas fa-ruler'}
         />
      </div>
   {/if}

   <!--Multi-Attack-->
   {#if $document.flags.titan.chatContext.parameters.multiAttack}
      <div class="stat">
         <IconTag label={localize('multiAttack')} icon={'fas fa-swords'} />
      </div>
   {/if}

   <!--Item Traits-->
   {#each $document.flags.titan.chatContext.parameters.itemTrait as trait}
      <div class="stat" use:tooltip={{ content: trait.description }}>
         <Tag label={trait.name} />
      </div>
   {/each}

   <!--Attack Traits-->
   {#each $document.flags.titan.chatContext.parameters.attack.trait as trait}
      <div
         class="stat"
         use:tooltip={{ content: localize(`${trait.name}.desc`) }}
      >
         {#if trait.type === 'number'}
            <StatTag label={localize(trait.name)} value={trait.value} />
         {:else}
            <Tag label={localize(trait.name)} />
         {/if}
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
