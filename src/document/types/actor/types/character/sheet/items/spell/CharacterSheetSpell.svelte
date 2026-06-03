<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import CharacterSheetSpellCastingCheck
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetSpellCastingCheck.svelte';
   import CharacterSheetCondensedCastingCheckButton
      from '~/document/types/actor/types/character/sheet/items/spell/CharacterSheetCondensedCastingCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetSpellProps
    * @property {TitanItem} [item] Reference to the Item document.
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetSpellProps} */
   let { item = undefined, isExpanded = $bindable(undefined) } = $props();

   /** @type {object} Reactive bridge to the parent document; descendants read live data via `data`. */
   const document = getContext('document');

   /** @type {SpellAspect[]} Standard Spell Aspects, re-read reactively through the document store. */
   const aspect = $derived(document.data.items.get(item._id)?.system.aspect ?? []);

   /** @type {object[]} Custom Spell Aspects, re-read reactively through the document store. */
   const customAspect = $derived(document.data.items.get(item._id)?.system.customAspect ?? []);

   /** @type {object[]} Casting checks, re-read reactively through the document store. */
   const check = $derived(document.data.items.get(item._id)?.system.check ?? []);

   /** @type {string} Rich-text description, re-read reactively through the document store. */
   const description = $derived(document.data.items.get(item._id)?.system.description);

   /** @type {string} Rarity key, re-read reactively through the document store. */
   const rarity = $derived(document.data.items.get(item._id)?.system.rarity);

   /** @type {string} Spell tradition, re-read reactively through the document store. */
   const tradition = $derived(document.data.items.get(item._id)?.system.tradition);

   /** @type {number} XP cost, re-read reactively through the document store. */
   const xpCost = $derived(document.data.items.get(item._id)?.system.xpCost);

   /** @type {object[]} Custom traits, re-read reactively through the document store. */
   const customTrait = $derived(document.data.items.get(item._id)?.system.customTrait ?? []);

   /** @type {SpellAspect[]} List of enabled Spell Aspects. */
   const enabledAspects = $derived(aspect.filter((aspect) => aspect.enabled));
</script>

<CharacterSheetItem {item} bind:isExpanded>
   {#snippet controls()}
      <!--Cast Spell-->
      <div class="button">
         <CharacterSheetCondensedCastingCheckButton itemId={item._id}/>
      </div>

      <!--Send to Chat button-->
      <div class="button">
         <CharacterSheetItemSendToChatButton {item}/>
      </div>

      <!--Edit Button-->
      <div class="button">
         <CharacterSheetItemEditButton {item}/>
      </div>

      <!--Delete Button-->
      <div class="button">
         <CharacterSheetItemDeleteButton itemId={item._id}/>
      </div>
   {/snippet}

   <!--Item Check Data-->
   <div class="section tags">
      <CharacterSheetSpellCastingCheck {item}/>
   </div>

   <!--Spell Aspects-->
   {#if enabledAspects.length > 0 || customAspect.length > 0}
      <div class="section tags">
         <SpellAspectTags
            standardAspects={enabledAspects}
            customAspects={customAspect}
         />
      </div>
   {/if}

   <!--Item Checks-->
   {#if check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks {item}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if description !== '' && description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={description}/>
      </div>
   {/if}

   <!--Footer-->
   <div class="section tags small-text">
      <!--Rarity-->
      <div class="tag">
         <RarityTag {rarity}/>
      </div>

      <!--Tradition-->
      <div class="tag">
         <StatTag
            label={localize('tradition')}
            value={tradition}
         />
      </div>

      <!--XP Cost-->
      {#if xpCost}
         <div class="tag">
            <StatTag
               label={localize('xpCost')}
               value={xpCost}
            />
         </div>
      {/if}

      <!--Custom Traits-->
      {#each customTrait as trait}
         <div class="tag">
            <Tag tooltip={{ text: trait.description, localize: false }}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</CharacterSheetItem>

<style lang="scss">
   .button:not(:first-child) {
      @include margin-left-standard;
   }

   .section {
      width: 100%;

      &:not(.rich-text) {
         @include padding-bottom-large;
      }

      &:not(.rich-text, .tags) {
         @include padding-top-large;
      }

      &:not(:first-child) {
         @include border-top;
      }

      &.tags {
         @include flex-row;
         @include flex-group-center;

         flex-wrap: wrap;

         .tag {
            @include tag-container-child-margin;
         }
      }

      &:not(.tags, .buttons) {
         @include flex-column;
         @include flex-group-top;
      }

      &.small-text {
         @include font-size-small;
      }
   }
</style>
