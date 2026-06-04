<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SHIELD_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/shield/ShieldTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import { DEFENSE_ICON } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} ShieldChatStatsProps
    * @property {object} [item] - The Item this component belongs to.
    */

   /** @type {ShieldChatStatsProps} */
   const { item = void 0 } = $props();

   /** @type {Record<string, string>} Map of shield trait names to their description localization keys. */
   const traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;
</script>

<div class="stats">
   <div class="stat">
      <IconStatTag
         icon={DEFENSE_ICON}
         label={localize('defense')}
         tooltip={'defense.desc'}
         value={item.defense}
      />
   </div>

   <!--Rarity-->
   <div class="stat">
      <RarityTag rarity={item.rarity}/>
   </div>

   <!--Value-->
   {#if item.value}
      <div class="stat">
         <ValueTag value={item.value}/>
      </div>
   {/if}

   <!--Traits-->
   {#each item.trait as trait}
      <div class="stat">
         {#if typeof (trait.value) === 'number'}
            <StatTag
               tooltip={traitDescriptions[trait.name]}
               label={localize(trait.name)}
               value={trait.value}
            />
         {:else}
            <Tag tooltip={traitDescriptions[trait.name]}>
               {localize(trait.name)}
            </Tag>
         {/if}
      </div>
   {/each}

   <!--Custom Traits-->
   {#each item.customTrait as trait}
      <div class="stat">
         <Tag tooltip={{ text: trait.description, localize: false }}>
            {trait.name}
         </Tag>
      </div>
   {/each}
</div>

<style lang="scss">
   .stats {
      @include tag-container;
      @include font-size-small;

      width: 100%;
   }
</style>
