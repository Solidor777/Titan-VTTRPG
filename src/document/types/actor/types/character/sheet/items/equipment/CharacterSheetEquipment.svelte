<script>
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import CharacterSheetItem
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItem.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemEquipButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEquipButton.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';
   import { getContext } from 'svelte';

   /**
    * @typedef {object} CharacterSheetEquipmentProps
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetEquipmentProps} */
   let { isExpanded = $bindable(undefined) } = $props();

   /** @type {object} The embedded equipment bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {boolean} The item's equipped state, read reactively through the embedded bridge. */
   const equipped = $derived(document.data?.system.equipped);

   /** @type {number} The item's check count, read reactively through the embedded bridge. */
   const checkLength = $derived(document.data?.system.check.length);

   /** @type {string} The item's description, read reactively through the embedded bridge. */
   const description = $derived(document.data?.system.description);

   /** @type {string} The item's rarity, read reactively through the embedded bridge. */
   const rarity = $derived(document.data?.system.rarity);

   /** @type {number} The item's value, read reactively through the embedded bridge. */
   const value = $derived(document.data?.system.value);

   /** @type {Array<object>} The item's custom traits, read reactively through the embedded bridge. */
   const customTrait = $derived(document.data?.system.customTrait ?? []);
</script>

<CharacterSheetItem bind:isExpanded>
   {#snippet controls()}
      <!--Toggle Equipped button-->
      {#if equipped === false || checkLength === 0}
         <div class="button">
            <CharacterSheetItemEquipButton {equipped}/>
         </div>
      {:else if (checkLength > 0)}
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

   <!--Equip button-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetItemEquipButton {equipped}/>
      </div>
   {/if}

   <!--Item Checks-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetItemChecks/>
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

      <!--Value-->
      {#if value}
         <div class="tag">
            <ValueTag {value}/>
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
