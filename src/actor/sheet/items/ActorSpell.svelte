<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import ActorItemExpandButton from "./ActorItemExpandButton.svelte";
   import ActorItemSendToChatButton from "./ActorItemSendToChatButton.svelte";
   import ActorItemEditButton from "./ActorItemEditButton.svelte";
   import ActorItemDeleteButton from "./ActorItemDeleteButton.svelte";
   import ActorItemDescription from "./ActorItemDescription.svelte";
   import ActorItemFooter from "./ActorItemFooter.svelte";
   import ActorItemRarity from "./ActorItemRarity.svelte";
   import ActorItemTradition from "./ActorItemTradition.svelte";
   import ActorCheckLabel from "~/actor/sheet/ActorCheckLabel.svelte";
   import ActorCheckButtonSmall from "~/actor/sheet/ActorCheckButtonSmall.svelte";
   import ActorDicePool from "../ActorDicePool.svelte";

   // Reference to the docuement
   const document = getContext("DocumentSheetObject");

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

   // Item reference
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="actor-spell">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <ActorItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <div>
               <ActorCheckButtonSmall check={item.system.check} />
            </div>

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
            <!--Item Description-->
            <div class="item-expandable-content">
               <ActorItemDescription description={"Temporary Item Description"} />
            </div>

            <!--Footer-->
            <div class="item-expandable-content">
               <ActorItemFooter>
                  <ActorItemRarity {item} />
                  <ActorItemTradition {item} />
                  <ActorCheckLabel check={item.system.check} />
                  <ActorDicePool attribute={item.system.check.attribute} skill={item.system.check.skill} />
               </ActorItemFooter>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../Styles/Mixins.scss";

   .actor-spell {
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
            @include flex-row;
            @include flex-group-center;
            width: 100%;

            &:not(:first-child) {
               @include border-top;
               margin-top: 0.5rem;
               padding-top: 0.5rem;
            }
         }
      }
   }
</style>
