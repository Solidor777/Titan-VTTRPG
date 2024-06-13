<script>
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
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
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type TitanItem Reference to the Item document. */
   export let item = void 0;

   /** @type boolean Whether this Item is currently expanded. */
   export let isExpanded = void 0;

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
         <!--Quantity-->
         <div class="field">
            <IntegerIncrementInput
               bind:value={item.system.quantity}
               on:change={() => {
                     item.update({
                        system: {
                           quantity: item.system.quantity,
                        },
                     });
                  }}
            />
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
      </div>
   </div>

   <!--Expandable content-->
   {#if isExpanded === true}
      <div class="expandable-content" transition:slide|local>
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

         <!--Footer-->
         <div class="section tags small-text">
            <div class="tag">
               <StatTag
                  label={localize('quantity')}
                  value={item.system.quantity}
               />
            </div>

            <!--Rarity-->
            <div class="tag">
               <RarityTag rarity={item.system.rarity}/>
            </div>

            <!--Value-->
            {#if item.system.value}
               <div class="tag">
                  <ValueTag value={item.system.value}/>
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

            .field {
               @include flex-row;
               @include flex-group-center;

               --titan-input-width: 80px;
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

               &:not(.tags) {
                  padding-top: var(--titan-padding-large);
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
