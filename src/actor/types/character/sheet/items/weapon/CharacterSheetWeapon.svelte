<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterSheetItemExpandButton from "~/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte";
   import CharacterSheetItemSendToChatButton from "~/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "~/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "~/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte";
   import CharacterSheetItemDescription from "~/actor/types/character/sheet/items/CharacterSheetItemDescription.svelte";
   import CharacterSheetItemEquipButton from "~/actor/types/character/sheet/items/CharacterSheetItemEquipButton.svelte";
   import CharacterSheetItemFooter from "~/actor/types/character/sheet/items/CharacterSheetItemFooter.svelte";
   import CharacterSheetItemRarity from "~/actor/types/character/sheet/items/CharacterSheetItemRarity.svelte";
   import CharacterSheetItemValue from "~/actor/types/character/sheet/items/CharacterSheetItemValue.svelte";

   // Reference to the docuement
   const document = getContext("DocumentStore");

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

   // Item reference
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="item" transition:slide|local>
      <!--Header-->
      <div class="header">
         <!--Expand button-->
         <CharacterSheetItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="controls">
            <!--Toggle Equipped button-->
            <div class="button">
               <CharacterSheetItemEquipButton {item} equipped={item.system.equipped} />
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
            <!--Item Description-->
            <div class="section">
               <CharacterSheetItemDescription description={"Temporary Item Description"} />
            </div>

            <!--Attack description-->
            <div class="section">
               <CharacterSheetItemDescription description={"Temporary Attack Notes"} />
            </div>

            <!--Footer-->
            <div class="section">
               <CharacterSheetItemFooter>
                  <CharacterSheetItemRarity {item} />
                  <CharacterSheetItemValue {item} />
               </CharacterSheetItemFooter>
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
         width: 100%;
         font-weight: bold;

         .controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .button {
               &:not(:first-child) {
                  margin-left: 0.5rem;
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
         padding: 0.25rem;

         .section {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.25rem;
               margin-top: 0.25rem;
               padding-top: 0.25rem;
            }
         }
      }
   }
</style>
