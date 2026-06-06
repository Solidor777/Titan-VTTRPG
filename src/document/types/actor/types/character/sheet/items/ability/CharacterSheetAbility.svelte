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
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetAbilityProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded ability bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Check-->
      {#if document.data?.system.check.length > 0}
         <div class="button">
            <CharacterSheetCondensedItemCheckButton/>
         </div>
      {/if}

      <!--Send to Chat button-->
      <div class="button">
         <CharacterSheetItemSendToChatButton/>
      </div>

      <!--Edit Button-->
      <div class="button">
         <CharacterSheetItemEditButton/>
      </div>

      <!--Delete Button-->
      <div class="button">
         <CharacterSheetItemDeleteButton/>
      </div>
   {/snippet}

   <!--Item Checks-->
   {#if document.data?.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks/>
      </div>
   {/if}

   <!--Item Description-->
   {#if !(isHTMLBlank(document.data?.system.description))}
      <div class="section rich-text">
         <RichText value={document.data?.system.description}/>
      </div>
   {/if}

   <!--Footer-->
   <div class="section tags small-text">
      <!--Rarity-->
      <div class="tag">
         <RarityTag rarity={document.data?.system.rarity}/>
      </div>

      <!--Action-->
      {#if document.data?.system.action}
         <div class="tag">
            <Tag>{localize('action')}</Tag>
         </div>
      {/if}

      <!--Reaction-->
      {#if document.data?.system.reaction}
         <div class="tag">
            <Tag>{localize('reaction')}</Tag>
         </div>
      {/if}

      <!--Passive-->
      {#if document.data?.system.passive}
         <div class="tag">
            <Tag>{localize('passive')}</Tag>
         </div>
      {/if}

      <!--XP Cost-->
      {#if document.data?.system.xpCost}
         <div class="tag">
            <StatTag
               label={localize('xpCost')}
               value={document.data?.system.xpCost}
            />
         </div>
      {/if}

      <!--Custom Traits-->
      {#each document.data?.system.customTrait ?? [] as trait}
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
