<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
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
   import CharacterSheetShieldStats
      from '~/document/types/actor/types/character/sheet/items/shield/CharacterSheetShieldStats.svelte';
   import CharacterSheetCondensedItemCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte';

   /** @type TitanItem Reference to the Item document. */
   export let item = void 0;

   /** @type boolean Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   /** @type object Reference to the Document store. */
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
         {#if $document.system.equipped.shield !== item._id || item.system.check.length === 0}
            <div class="button">
               <CharacterSheetItemEquipButton
                  {item}
                  equipped={$document.system.equipped.shield === item._id}
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
                  equipped={$document.system.equipped.shield === item._id}
               />
            </div>
         {/if}

         <!--Shield Stats-->
         <div class="section tags">
            <CharacterSheetShieldStats {item}/>
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
         @include border-top-bottom-right;
         @include panel-1;

         padding: var(--titan-padding-standard);
         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               margin-left: var(--titan-padding-standard);
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;

            height: 100%;

            .button {
               &:not(:first-child) {
                  margin-left: var(--titan-padding-standard);
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
         padding: 0 var(--titan-padding-standard);

         .section {
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: var(--titan-padding-large);
               padding-top: var(--titan-padding-large);
            }

            &:not(:first-child) {
               @include border-top;
            }

            &:not(.tags) {
               @include flex-column;
               @include flex-group-top;
            }
         }
      }
   }
</style>
