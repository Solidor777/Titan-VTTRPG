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

   /**
    * @typedef {object} CharacterSheetAbilityProps
    * @property {TitanItem} [item] Reference to the Item document.
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetAbilityProps} */
   let { item = undefined, isExpanded = $bindable(undefined) } = $props();
</script>

<CharacterSheetItem {item} bind:isExpanded>
   {#snippet controls()}
      <!--Check-->
      {#if item.system.check.length > 0}
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
   {#if item.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks {item}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if !(isHTMLBlank(item.system.description))}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}

   <!--Footer-->
   <div class="section tags small-text">
      <!--Rarity-->
      <div class="tag">
         <RarityTag rarity={item.system.rarity}/>
      </div>

      <!--Action-->
      {#if item.system.action}
         <div class="tag">
            <Tag>{localize('action')}</Tag>
         </div>
      {/if}

      <!--Reaction-->
      {#if item.system.reaction}
         <div class="tag">
            <Tag>{localize('reaction')}</Tag>
         </div>
      {/if}

      <!--Passive-->
      {#if item.system.passive}
         <div class="tag">
            <Tag>{localize('passive')}</Tag>
         </div>
      {/if}

      <!--XP Cost-->
      {#if item.system.xpCost}
         <div class="tag">
            <StatTag
               label={localize('xpCost')}
               value={item.system.xpCost}
            />
         </div>
      {/if}

      <!--Custom Traits-->
      {#each item.system.customTrait as trait}
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

      &.buttons {
         @include flex-row;
         @include flex-group-center;

         .button:not(:first-child) {
            @include margin-left-standard;
         }
      }

      &.small-text {
         @include font-size-small;
      }
   }
</style>
