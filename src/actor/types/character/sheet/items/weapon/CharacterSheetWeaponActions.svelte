<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterSheetItemExpandButton from "../CharacterSheetItemExpandButton.svelte";
   import CharacterSheetItemSendToChatButton from "../CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "../CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "../CharacterSheetItemDeleteButton.svelte";
   import CharacterSheetItemDescription from "../CharacterSheetItemDescription.svelte";
   import CharacterSheetWeaponMultiAttackButton from "./CharacterSheetWeaponMultiAttackButton.svelte";
   import CharacterSheetWeaponAttacks from "./CharacterSheetWeaponAttacks.svelte";

   // Reference to the docuement
   const document = getContext("DocumentStore");

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

   // Weapon list
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="actor-inventory-weapon">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <CharacterSheetItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Multi attack -->
            <div class="item-expandable-content">
               <CharacterSheetWeaponMultiAttackButton {item} />
            </div>

            <!--Send to Chat button-->
            <div class="item-control-button">
               <CharacterSheetItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="item-control-button">
               <CharacterSheetItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <CharacterSheetItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="item-expandable-container" transition:slide|local>
            <!--Item Description-->
            <div class="item-expandable-content">
               <CharacterSheetItemDescription description={"Temporary Attack Notes"} />
            </div>

            <!--Attacks list-->
            <div class="item-expandable-content">
               <CharacterSheetWeaponAttacks {item} />
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
         @include font-size-normal;
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
