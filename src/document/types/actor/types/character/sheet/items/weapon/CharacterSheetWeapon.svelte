<script>
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
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
   import CharacterSheetWeaponMultiAttackButton
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponMultiAttackButton.svelte';
   import CharacterSheetWeaponAttacks
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte';
   import CharacterSheetCondensedAttackCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte';

   /** @type TitanItem Reference to the Item document. */
   export let item = void 0;

   // Expanded object
   export let isExpanded = void 0;
</script>

<div class="item" transition:slide|local>
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
         <div class="button">
            {#if !item.system.equipped}
               <!--Toggle Equipped button-->
               <CharacterSheetItemEquipButton
                  {item}
                  equipped={item.system.equipped}
               />
            {:else if item.system.attack.length > 0}
               <CharacterSheetCondensedAttackCheckButton itemId={item._id}/>
            {/if}
         </div>

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
         <div class="section buttons">
            <div class="button">
               <CharacterSheetWeaponMultiAttackButton {item}/>
            </div>

            <div class="button">
               <CharacterSheetItemEquipButton
                  {item}
                  equipped={item.system.equipped}
               />
            </div>
         </div>

         <!--Attacks-->
         <div class="section">
            <CharacterSheetWeaponAttacks {item}/>
         </div>

         <!--Attack notes-->
         {#if item.system.attackNotes !== '' && item.system.attackNotes !== '<p></p>'}
            <div class="section rich-text">
               <RichText text={item.system.attackNotes}/>
            </div>
         {/if}

         <!--Item Description-->
         {#if item.system.description !== '' && item.system.description !== '<p></p>'}
            <div class="section rich-text">
               <RichText text={item.system.description}/>
            </div>
         {/if}

         <!--Item Checks-->
         {#if item.system.check.length > 0}
            <div class="section">
               <CharacterSheetItemChecks {item}/>
            </div>
         {/if}

         <!--Footer-->
         <div class="section tags small-text">
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
               <div class="tag" use:tooltip={{ content: trait.description }}>
                  <Tag label={trait.name}/>
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

            &.buttons {
               @include flex-row;
               @include flex-group-center;

               .button:not(:first-child) {
                  margin-left: var(--titan-padding-standard);
               }
            }

            &.tags {
               @include flex-row;
               @include flex-group-center;

               flex-wrap: wrap;

               .tag {
                  @include tag-margin;
               }
            }

            &:not(.buttons) &:not(.tags) {
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
