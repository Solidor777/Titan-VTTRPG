<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterItemExpandButton from "../CharacterItemExpandButton.svelte";
   import CharacterItemSendToChatButton from "../CharacterItemSendToChatButton.svelte";
   import CharacterItemEditButton from "../CharacterItemEditButton.svelte";
   import CharacterItemDeleteButton from "../CharacterItemDeleteButton.svelte";
   import CharacterItemDescription from "../CharacterItemDescription.svelte";
   import CharacterWeaponMultiAttackButton from "./CharacterWeaponMultiAttackButton.svelte";
   import CharacterWeaponAttacks from "./CharacterWeaponAttacks.svelte";

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
         <CharacterItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Multi attack -->
            <div class="item-expandable-content">
               <CharacterWeaponMultiAttackButton {item} />
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
               <CharacterItemDescription description={"Temporary Attack Description"} />
            </div>

            <!--Attacks list-->
            <div class="item-expandable-content">
               <CharacterWeaponAttacks {item} />
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
