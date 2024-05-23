<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import CharacterSheetItemExpandButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemImage
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetCondensedItemCheckButton
      from "~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedItemCheckButton.svelte";
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';

   /** @type {string} The ID of the item to get the check from. */
   export let itemId = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   /** @type TitanActor Reference to the Character document. */
   const document = getContext('document');

   /** @type TitanActor Reference to the Item document. */
   let item;
   $: {
      item = $document.items.get(itemId);
   }
</script>

{#if item}
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
            <!--Check-->
            {#if item.system.check.length > 0}
               <div>
                  <CharacterSheetCondensedItemCheckButton {itemId}/>
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
               <CharacterSheetItemDeleteButton {itemId}/>
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="expandable-content" transition:slide|local>
            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="section">
                  <CharacterSheetItemChecks {itemId}/>
               </div>
            {/if}

            <!--Item Description-->
            {#if item.system.description !== '' && item.system.description !== '<p></p>'}
               <div class="section rich-text">
                  <RichText text={item.system.description}/>
               </div>
            {/if}

            <!--Footer-->
            <div class="section tags small-text">
               <!-- Rarity-->
               <div class="tag">
                  <RarityTag rarity={item.system.rarity}/>
               </div>

               <!--Action-->
               {#if item.system.action}
                  <!-- Rarity-->
                  <div class="tag">
                     <Tag label={localize('action')}/>
                  </div>
               {/if}

               <!--Reaction-->
               {#if item.system.reaction}
                  <!-- Rarity-->
                  <div class="tag">
                     <Tag label={localize('reaction')}/>
                  </div>
               {/if}

               <!--Passive-->
               {#if item.system.passive}
                  <!-- Rarity-->
                  <div class="tag">
                     <Tag label={localize('passive')}/>
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
                  <div class="tag" use:tooltip={{ content: trait.description }}>
                     <Tag label={trait.name}/>
                  </div>
               {/each}
            </div>
         </div>
      {/if}
   </div>
{/if}


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

               .tag {
                  @include tag-margin;
               }
            }

            &:not(.tags) {
               @include flex-column;
               @include flex-group-top;
            }

            &.small-text {
               @include font-size-small;
            }
         }
      }
   }
</style>
