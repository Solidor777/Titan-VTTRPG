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

   /** @type {object} The nearest document bridge (embedded shield or chat-message snapshot). */
   const document = getContext('document');

   /** @type {object} Descriptions of each shield trait. */
   const traitDescriptions = SHIELD_TRAIT_DESCRIPTIONS;

   /** @type {number} The shield's defense value, read reactively through the document bridge. */
   const defense = $derived(document.data?.system.defense);

   /** @type {string} The shield's rarity, read reactively through the document bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The shield's gp value, read reactively through the document bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The shield's traits, read reactively through the document bridge. */
   const trait = $derived(document.data?.system.trait ?? []);

   /** @type {Array<object>} The shield's custom traits, read reactively through the document bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<div class="stats">
   <!--Defense-->
   <div class="stat">
      <IconStatTag
         icon={DEFENSE_ICON}
         label={localize('defense')}
         tooltip={'defense.desc'}
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
