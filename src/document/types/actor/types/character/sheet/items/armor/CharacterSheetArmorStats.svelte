<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { ARMOR_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/armor/ArmorTraits.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import { ARMOR_ICON } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} CharacterSheetArmorStatsProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetArmorStatsProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Descriptions of each armor trait. */
   const traitDescriptions = ARMOR_TRAIT_DESCRIPTIONS;

   /** @type {number} The armor's current value, re-read through document.data so the row updates in place. */
   const armorValue = $derived(document.data.items.get(item._id)?.system.armor.value);

   /** @type {number} The armor's max value, re-read through document.data so the row updates in place. */
   const armorMax = $derived(document.data.items.get(item._id)?.system.armor.max);

   /** @type {string} The armor's rarity, re-read through document.data so the row updates in place. */
   const rarity = $derived(document.data.items.get(item._id)?.system.rarity);

   /** @type {number} The armor's gp value, re-read through document.data so the row updates in place. */
   const value = $derived(document.data.items.get(item._id)?.system.value);

   /** @type {Array<object>} The armor's traits, re-read through document.data so the row updates in place. */
   const trait = $derived(document.data.items.get(item._id)?.system.trait ?? []);

   /** @type {Array<object>} The armor's custom traits, re-read through document.data for in-place updates. */
   const customTrait = $derived(document.data.items.get(item._id)?.system.customTrait ?? []);
</script>

<div class="stats">
   <div class="stat" use:tooltipAction={'armor.desc'}>
      <IconStatTag
         icon={ARMOR_ICON}
         label={localize('armor')}
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
            tooltip={localize(traitDescriptions[traitEntry.name])}
         />
      </div>
   {/each}

   <!--Custom traits-->
   {#each customTrait as customTraitEntry}
      <div class="stat">
         <Tag tooltip={customTraitEntry.description}>
            {customTraitEntry.name}
         </Tag>
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
         @include tag-container-child-margin;
      }
   }
</style>
