<script>
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import isHTMLBlank from '~/helpers/utility-functions/IsHTMLBlank.js';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetAbilityProps
    * @property {TitanItem} [item] Reference to the Item document.
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetAbilityProps} */
   let { item = undefined, isExpanded = $bindable(undefined) } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Re-reads this ability item through the reactive `document.data` store. Invoked inline at each display
    * read so the read subscribes to the document's update hooks and re-runs in place when the item changes.
    * A `$derived` returning the live item is insufficient: the item reference is stable across updates, so
    * its value never trips Svelte's equality check and downstream reads stay stale. Calling this in markup
    * routes every read through `document.data`, the only reactive dependency Svelte tracks.
    * @returns {TitanItem | undefined} The live ability item from the reactive collection.
    */
   const reactiveItem = () => document.data.items.get(item._id);
</script>

<CharacterSheetItem {item} bind:isExpanded>
   {#snippet controls()}
      <!--Check-->
      {#if reactiveItem()?.system.check.length > 0}
         <div class="button">
            <CharacterSheetCondensedItemCheckButton itemId={item._id}/>
         </div>
      {/if}

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

   <!--Item Checks-->
   {#if reactiveItem()?.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks {item}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if !(isHTMLBlank(reactiveItem()?.system.description))}
      <div class="section rich-text">
         <RichText value={reactiveItem()?.system.description}/>
      </div>
   {/if}

   <!--Footer-->
   <div class="section tags small-text">
      <!--Rarity-->
      <div class="tag">
         <RarityTag rarity={reactiveItem()?.system.rarity}/>
      </div>

      <!--Action-->
      {#if reactiveItem()?.system.action}
         <div class="tag">
            <Tag>{localize('action')}</Tag>
         </div>
      {/if}

      <!--Reaction-->
      {#if reactiveItem()?.system.reaction}
         <div class="tag">
            <Tag>{localize('reaction')}</Tag>
         </div>
      {/if}

      <!--Passive-->
      {#if reactiveItem()?.system.passive}
         <div class="tag">
            <Tag>{localize('passive')}</Tag>
         </div>
      {/if}

      <!--XP Cost-->
      {#if reactiveItem()?.system.xpCost}
         <div class="tag">
            <StatTag
               label={localize('xpCost')}
               value={reactiveItem()?.system.xpCost}
            />
         </div>
      {/if}

      <!--Custom Traits-->
      {#each reactiveItem()?.system.customTrait ?? [] as trait}
         <div class="tag">
            <Tag tooltip={trait.description}>
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
