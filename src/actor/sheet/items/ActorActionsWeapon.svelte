<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ActorItemExpandButton from "./ActorItemExpandButton.svelte";
   import ActorItemSendToChatButton from "./ActorItemSendToChatButton.svelte";
   import ActorItemEditButton from "./ActorItemEditButton.svelte";
   import ActorItemDeleteButton from "./ActorItemDeleteButton.svelte";
   import ActorItemDescription from "./ActorItemDescription.svelte";
   import ActorWeaponAttacks from "./ActorWeaponAttacks.svelte";
   import ActorWeaponMultiAttackButton from "./ActorWeaponMultiAttackButton.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the application
   const application = getContext("external").application;

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
         <ActorItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Send to Chat button-->
            <div class="item-control-button">
               <ActorItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="item-control-button">
               <ActorItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="item-control-button">
               <ActorItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="item-expandable-container" transition:slide|local>
            <!--Multi attack -->
            <div class="item-expandable-content">
               <ActorWeaponMultiAttackButton {item} />
            </div>

            <!--Item Description-->
            <div class="item-expandable-content">
               <ActorItemDescription description={"Temporary Attack Description"} />
            </div>

            <!--Attacks list-->
            <div class="item-expandable-content">
               <ActorWeaponAttacks {item} />
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

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
