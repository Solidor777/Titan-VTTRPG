<script>
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
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
   import CharacterSheetWeaponMultiAttackButton
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponMultiAttackButton.svelte';
   import CharacterSheetWeaponAttacks
      from '~/document/types/actor/types/character/sheet/items/weapon/CharacterSheetWeaponAttacks.svelte';
   import CharacterSheetCondensedAttackCheckButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetCondensedAttackCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetWeaponProps
    * @property {TitanItem} [item] Reference to the Item document.
    * @property {boolean} [isExpanded] Whether this Item is currently expanded.
    */

   /** @type {CharacterSheetWeaponProps} */
   let { item = undefined, isExpanded = $bindable(undefined) } = $props();
</script>

<CharacterSheetItem {item} bind:isExpanded>
   {#snippet controls()}
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
         <RichText value={item.system.attackNotes}/>
      </div>
   {/if}

   <!--Item Description-->
   {#if item.system.description !== '' && item.system.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.system.description}/>
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
