<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterItemExpandButton from "../CharacterItemExpandButton.svelte";
   import CharacterItemSendToChatButton from "../CharacterItemSendToChatButton.svelte";
   import CharacterItemEditButton from "../CharacterItemEditButton.svelte";
   import CharacterItemDeleteButton from "../CharacterItemDeleteButton.svelte";
   import CharacterItemDescription from "../CharacterItemDescription.svelte";
   import CharacterItemEquipButton from "../CharacterItemEquipButton.svelte";
   import CharacterItemFooter from "../CharacterItemFooter.svelte";
   import CharacterItemRarity from "../CharacterItemRarity.svelte";
   import CharacterItemValue from "../CharacterItemValue.svelte";

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
   <div class="actor-inventory-weapon">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <CharacterItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Toggle Equipped button-->
            <div class="item-control-button">
               <CharacterItemEquipButton {item} equipped={item.system.equipped} />
            </div>

            <!--Send to Chat button-->
            <div class="item-control-button">
               <CharacterItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="item-control-button">
               <CharacterItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <CharacterItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="item-expandable-container" transition:slide|local>
            <!--Item Description-->
            <div class="item-expandable-content">
               <CharacterItemDescription description={"Temporary Item Description"} />
            </div>

            <!--Attack description-->
            <div class="item-expandable-content">
               <CharacterItemDescription description={"Temporary Attack Description"} />
            </div>

            <!--Footer-->
            <div class="item-expandable-content">
               <CharacterItemFooter>
                  <CharacterItemRarity {item} />
                  <CharacterItemValue {item} />
               </CharacterItemFooter>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .actor-inventory-weapon {
      @include flex-column;
      width: 100%;

      .item-header {
         @include flex-row;
         @include flex-space-between;
         width: 100%;
         font-size: 1rem;
         font-weight: bold;

         .item-controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .item-control-button {
               &:not(:first-child) {
                  margin-left: 0.5rem;
               }
            }
         }
      }

      .item-expandable-container {
         margin-top: 0.5rem;

         .item-expandable-content {
            &:not(:first-child) {
               @include border-top;
               margin-top: 0.5rem;
               padding-top: 0.5rem;
            }
         }
      }
   }
</style>
