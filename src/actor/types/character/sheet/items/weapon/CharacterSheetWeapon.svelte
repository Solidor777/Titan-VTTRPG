<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import RarityTag from "~/helpers/svelte-components/tag/RarityTag.svelte";
   import ValueTag from "~/helpers/svelte-components/tag/ValueTag.svelte";
   import RichText from "~/helpers/svelte-components/RichText.svelte";
   import CharacterSheetItemExpandButton from "~/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte";
   import CharacterSheetItemSendToChatButton from "~/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "~/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "~/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte";
   import CharacterSheetItemEquipButton from "~/actor/types/character/sheet/items/CharacterSheetItemEquipButton.svelte";
   import CharacterSheetItemImage from "~/actor/types/character/sheet/items/CharacterSheetItemImage.svelte";
   import CharacterSheetItemChecks from "~/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte";
   import CharacterSheetWeaponMultiAttackButton from "./CharacterSheetWeaponMultiAttackButton.svelte";
   import CharacterSheetWeaponAttacks from "./CharacterSheetWeaponAttacks.svelte";
   import CharacterSheetWeaponAttackButton from "./CharacterSheetWeaponAttackButton.svelte";

   // Weapon id
   export let id = void 0;

   // Expanded object
   export let isExpanded = void 0;

   // Setup context references
   const document = getContext("DocumentStore");
   const application = getContext("external").application;

   // Item reference
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="item" transition:slide|local>
      <!--Header-->
      <div class="header">
         <div class="label">
            <!--Image-->
            <div class="image">
               <CharacterSheetItemImage {item} />
            </div>

            <!--Expand button-->
            <div class="button">
               <CharacterSheetItemExpandButton {item} bind:isExpanded />
            </div>
         </div>

         <!--Controls-->
         <div class="controls">
            <div class="button">
               {#if item.system.equipped}
                  <!--Toggle Equipped button-->
                  <CharacterSheetItemEquipButton {item} equipped={item.system.equipped} />
               {:else}
                  <CharacterSheetWeaponAttackButton
                     attack={item.system.attack[0]}
                     on:click={() => {
                        application.rollAttackCheck(item._id, 0);
                     }}
                  />
               {/if}
            </div>

            <!--Send to Chat button-->
            <div class="button">
               <CharacterSheetItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="button">
               <CharacterSheetItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="button">
               <CharacterSheetItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="expandable-content" transition:slide|local>
            <div class="section space-evenly">
               <CharacterSheetWeaponMultiAttackButton {item} />
               <CharacterSheetItemEquipButton {item} equipped={item.system.equipped} />
            </div>

            <!--Attacks-->
            <div class="section">
               <CharacterSheetWeaponAttacks {item} />
            </div>

            <!--Attack notes-->
            {#if item.system.attackNotes !== "" && item.system.attackNotes !== "<p></p>"}
               <div class="section rich-text">
                  <RichText text={item.system.attackNotes} />
               </div>
            {/if}

            <!--Item Description-->
            {#if item.system.description !== "" && item.system.description !== "<p></p>"}
               <div class="section rich-text">
                  <RichText text={item.system.description} />
               </div>
            {/if}

            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="section">
                  <CharacterSheetItemChecks {item} />
               </div>
            {/if}

            <!--Footer-->
            <div class="section space-evenly small-text">
               <RarityTag rarity={item.system.rarity} />
               <ValueTag value={item.system.value} />
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .item {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-space-between;
         @include border;
         @include panel-1;
         padding: 0.25rem;
         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               margin-left: 0.25rem;
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .button {
               &:not(:first-child) {
                  margin-left: 0.25rem;
               }
            }
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;
         @include border-bottom-sides;
         width: calc(100% - 1rem);
         padding: 0 0.25rem;

         .section {
            width: 100%;

            &:not(.rich-text) {
               padding: 0.5rem 0 0.5rem;
            }

            &:not(:first-child) {
               @include border-top;
            }

            &.space-evenly {
               @include flex-row;
               @include flex-space-evenly;
            }

            &:not(.space-evenly) {
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
