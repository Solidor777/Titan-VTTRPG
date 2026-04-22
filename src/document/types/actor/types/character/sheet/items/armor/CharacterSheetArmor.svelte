<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
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
   import CharacterSheetArmorStats
      from '~/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmorStats.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';

   /** @type {TitanItem} Reference to the Item document. */
   export let item = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');
</script>

<CharacterSheetItem {item} bind:isExpanded>
   <svelte:fragment slot="controls">
      <!--Toggle Equipped button-->
      {#if ($document.system.equipped.armor === item._id) === false || item.system.check.length === 0}
         <div class="button">
            <CharacterSheetItemEquipButton
               {item}
               equipped={$document.system.equipped.armor === item._id}
            />
         </div>
      {:else if item.system.check.length > 0}
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
   </svelte:fragment>

   <!--Equip button-->
   {#if item.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemEquipButton
            {item}
            equipped={$document.system.equipped.armor === item._id}
         />
      </div>
   {/if}

   <!--Armor Stats-->
   <div class="section tags">
      <CharacterSheetArmorStats {item}/>
   </div>

   <!--Item Checks-->
   {#if item.system.check.length > 0}
      <div class="section">
         <CharacterSheetItemChecks {item}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if item.system.description !== '' && item.system.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
      </div>
   {/if}
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