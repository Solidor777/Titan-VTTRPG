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
    * @property {TitanItem} [item] Reference to the Item document.
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetEquipmentProps} */
   let { item = undefined, isExpanded = $bindable(undefined) } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {boolean} The item's equipped state, re-read through document.data so the row updates in place. */
   const equipped = $derived(document.data.items.get(item._id)?.system.equipped);

   /** @type {number} The item's check count, re-read through document.data so the row updates in place. */
   const checkLength = $derived(document.data.items.get(item._id)?.system.check.length);

   /** @type {string} The item's description, re-read through document.data so the row updates in place. */
   const description = $derived(document.data.items.get(item._id)?.system.description);

   /** @type {string} The item's rarity, re-read through document.data so the footer updates in place. */
   const rarity = $derived(document.data.items.get(item._id)?.system.rarity);

   /** @type {number} The item's value, re-read through document.data so the footer updates in place. */
   const value = $derived(document.data.items.get(item._id)?.system.value);

   /** @type {Array<object>} The item's custom traits, re-read through document.data so the row updates. */
   const customTrait = $derived(document.data.items.get(item._id)?.system.customTrait ?? []);
</script>

<CharacterSheetItem {item} bind:isExpanded>
   {#snippet controls()}
      <!--Toggle Equipped button-->
      {#if equipped === false || checkLength === 0}
         <div class="button">
            <CharacterSheetItemEquipButton
               {item}
               {equipped}
            />
         </div>
      {:else if (checkLength > 0)}
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

   <!--Equip button-->
   {#if checkLength > 0}
      <div class="section">
         <CharacterSheetItemEquipButton
            {item}
            {equipped}
         />
      </div>
   {/if}

   <!--Item Checks-->
   {#if checkLength > 0}
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

      <!--Value-->
      {#if value}
         <div class="tag">
            <ValueTag {value}/>
         </div>
      {/if}

      <!--Custom Traits-->
      {#each customTrait as trait}
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
