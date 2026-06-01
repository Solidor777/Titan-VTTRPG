<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import { SHIELD_TRAIT_DESCRIPTIONS } from '~/document/types/item/types/shield/ShieldTraits.js';
   import IconStatTag from '~/helpers/svelte-components/tag/IconStatTag.svelte';
   import TraitTag from '~/helpers/svelte-components/tag/TraitTag.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import { DEFENSE_ICON } from '~/system/Icons.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /**
    * @typedef {object} CharacterSheetShieldStatsProps
    * @property {TitanItem} [item] The Item this component belongs to.
    */

   /** @type {CharacterSheetShieldStatsProps} */
   const { item = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} Descriptions of each shield trait. */
   const traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;

   /** @type {number} The shield's defense value, re-read through document.data so the row updates in place. */
   const defense = $derived(document.data.items.get(item._id)?.system.defense);

   /** @type {string} The shield's rarity, re-read through document.data so the row updates in place. */
   const rarity = $derived(document.data.items.get(item._id)?.system.rarity);

   /** @type {number} The shield's gp value, re-read through document.data so the row updates in place. */
   const value = $derived(document.data.items.get(item._id)?.system.value);

   /** @type {Array<object>} The shield's traits, re-read through document.data so the row updates in place. */
   const trait = $derived(document.data.items.get(item._id)?.system.trait ?? []);

   /** @type {Array<object>} The shield's custom traits, re-read through document.data for in-place updates. */
   const customTrait = $derived(document.data.items.get(item._id)?.system.customTrait ?? []);
</script>

<div class="stats">
   <div class="stat">
      <IconStatTag
         icon={DEFENSE_ICON}
         label={localize('defense')}
         tooltip={localize('defense.desc')}
         value={defense}
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

   <!--Custom Traits-->
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
