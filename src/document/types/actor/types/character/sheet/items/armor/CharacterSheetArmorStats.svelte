<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import {ARMOR_TRAIT_DESCRIPTIONS} from '~/document/types/item/types/armor/ArmorTraits.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import {ARMOR_ICON} from '~/system/Icons.js';

   // Item reference
   export let item = void 0;

   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;
</script>

<div class="stats">
   <div class="stat" use:tooltipAction="{localize('armor.desc')}">
      <IconStatTag
         icon={ARMOR_ICON}
         label={localize('armor')}
         value={item.system.armor.value === item.system.armor.max
            ? item.system.armor.value
            : `${item.system.armor.value} / ${item.system.armor.max}`}
      />
   </div>

   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.system.rarity}/>
   </div>

   <!--Value-->
   {#if item.system.value}
      <div class="stat">
         <ValueTag value={item.system.value}/>
      </div>
   {/if}

   <!--Traits-->
   {#each item.system.trait as trait}
      <div
         class="stat"
         use:tooltipAction="{localize(traitDescriptions[trait.name])}"
      >
         {#if typeof (trait.value) === 'number'}
            <StatTag label={localize(trait.name)} value={trait.value}/>
         {:else}
            <Tag label={localize(trait.name)}/>
         {/if}
      </div>
   {/each}

   <!--Custom traits-->
   {#each item.system.customTrait as trait}
      <div class="stat" use:tooltipAction="{trait.description}">
         <Tag label={trait.name}/>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include flex-row;
      @include flex-group-center;
      @include font-size-small;

      width: 100%;
      flex-wrap: wrap;

      .stat {
         @include tag-margin;
      }
   }
</style>
