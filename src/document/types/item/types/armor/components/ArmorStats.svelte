<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/armor/ArmorTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import { ARMOR_ICON } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type {object} The nearest document bridge (embedded armor or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object} Descriptions of each armor trait. */
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;

   /** @type {number} The armor's current value, read reactively through the document bridge. */
   const armorValue = $derived(document.data?.system.armor.value);

   /** @type {number} The armor's max value, read reactively through the document bridge. */
   const armorMax = $derived(document.data?.system.armor.max);

   /** @type {string} The armor's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The armor's gp value, read reactively through the document bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The armor's traits, read reactively through the document bridge. */
   const trait = $derived(document.data?.system.trait ?? []);

   /** @type {Array<object>} The armor's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Armor-->
   <div class="stat">
      <IconStatTag
         icon={ARMOR_ICON}
         label={localize('armor')}
         tooltip={'armor.desc'}
         value={armorValue === armorMax
            ? armorValue
            : `${armorValue} / ${armorMax}`}
      />
   </div>

   <!--Rarity-->
   <div class="stat">
      <RarityTag {rarity}/>
   </div>

   <!--Value-->
   {#if value}
      <div class="stat">
         <ValueTag {value}/>
      </div>
   {/if}

   <!--Traits-->
   {#each trait as traitEntry}
      <div class="stat">
         <TraitTag
            label={localize(traitEntry.name)}
            value={traitEntry.value}
            tooltip={traitDescriptions[traitEntry.name]}
         />
      </div>
   {/each}

   <!--Custom Traits-->
   {#each customTrait as customTraitEntry}
      <div class="stat">
         <Tag tooltip={{ text: customTraitEntry.description, localize: false }}>
            {customTraitEntry.name}
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
