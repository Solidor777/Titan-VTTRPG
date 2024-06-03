<script>
   import {getContext} from 'svelte';
   import {ATTACK_TRAIT_DESCRIPTIONS} from '~/document/types/item/types/weapon/AttackTraits.js';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import IconTag from '~/helpers/svelte-components/tag/IconTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import {ACCURACY_ICON, MELEE_ICON, MULTI_ATTACK_ICON, RANGE_ICON} from '~/system/Icons.js';

   // Document reference
   const document = getContext('document');
   const traitDescriptions = ATTACK_TRAIT_DESCRIPTIONS;
</script>

<div class="stats">
   <!--Type-->
   <div class="stat">
      <IconTag
         icon={$document.flags.titan.parameters.type === 'melee'
            ? MELEE_ICON
            : ACCURACY_ICON}
         label={localize($document.flags.titan.parameters.type)}
      />
   </div>

   <!--Range-->
   {#if $document.flags.titan.parameters.range !== 1}
      <div class="stat">
         <IconStatTag
            label={localize('range')}
            value={$document.flags.titan.parameters.range}
            icon={RANGE_ICON}
         />
      </div>
   {/if}

   <!--Multi-Attack-->
   {#if $document.flags.titan.parameters.multiAttack}
      <div class="stat">
         <IconTag
            label={localize('multiAttack')}
            icon={MULTI_ATTACK_ICON}
         />
      </div>
   {/if}

   <!--Custom Traits-->
   {#each $document.flags.titan.parameters.customTrait as trait}
      <div class="stat" use:tooltip={trait.description}>
         <Tag label={trait.name}/>
      </div>
   {/each}

   <!--Attack Traits-->
   {#each $document.flags.titan.parameters.attackTrait as trait}
      <div
         class="stat"
         use:tooltip={localize(traitDescriptions[trait.name])}
      >
         {#if typeof (trait.value) === 'number'}
            <StatTag label={localize(trait.name)} value={trait.value}/>
         {:else}
            <Tag label={localize(trait.name)}/>
         {/if}
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
