<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CharacterSheetItemExpandButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemEquipButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEquipButton.svelte';
   import CharacterSheetItemImage
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import CharacterSheetArmorStats
      from '~/document/types/actor/types/character/sheet/items/armor/CharacterSheetArmorStats.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';

   /** @type TitanItem Reference to the Item document. */
   export let item = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   // Setup context references
   const document = getContext('document');
</script>

<div class="item">
   <!--Header-->
   <div class="header">
      <div class="label">
         <!--Image-->
         <div class="image">
            <CharacterSheetItemImage {item}/>
         </div>

         <!--Expand button-->
         <div class="button">
            <CharacterSheetItemExpandButton bind:isExpanded {item}/>
         </div>
      </div>

      <!--Controls-->
      <div class="controls">
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
         <div
            class="button"
            use:tooltip={{ content: localize('sendToChat') }}
         >
            <CharacterSheetItemSendToChatButton {item}/>
         </div>

         <!--Edit Button-->
         <div class="button" use:tooltip={{ content: localize('editItem') }}>
            <CharacterSheetItemEditButton {item}/>
         </div>

         <!--Delete Button-->
         <div
            class="button"
            use:tooltip={{ content: localize('deleteItem') }}
         >
            <CharacterSheetItemDeleteButton itemId={item._id}/>
         </div>
      </div>
   </div>

   <!--Expandable content-->
   {#if isExpanded === true}
      <div class="expandable-content" transition:slide|local>
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
               <RichText text={item.system.description}/>
            </div>
         {/if}
      </div>
   {/if}
</div>

<style lang="scss">
   .item {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      .header {
         @include flex-row;
         @include flex-space-between;
         @include border;
         @include panel-1;

         padding: var(--padding-standard);
         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               margin-left: var(--padding-standard);
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            .button {
               &:not(:first-child) {
                  margin-left: var(--padding-standard);
               }
            }
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;
         @include border-bottom-sides;

         width: calc(100% - 16px);
         padding: 0 var(--padding-standard);

         .section {
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: var(--padding-large);

               &:not(.tags) {
                  padding-top: var(--padding-large);
               }
            }

            &:not(:first-child) {
               @include border-top;
            }

            &.tags {
               @include flex-row;
               @include flex-group-center;

               flex-wrap: wrap;
            }

            &:not(.tags) {
               @include flex-column;
               @include flex-group-top;
            }
         }
      }
   }
</style>
