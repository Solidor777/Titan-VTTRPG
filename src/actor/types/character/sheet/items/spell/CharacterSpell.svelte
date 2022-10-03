<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterSheetItemExpandButton from "../CharacterSheetItemExpandButton.svelte";
   import CharacterCheckButtonSmall from "../../checks/CharacterCheckButtonSmall.svelte";
   import CharacterSheetItemSendToChatButton from "../CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "../CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "../CharacterSheetItemDeleteButton.svelte";
   import CharacterSheetItemDescription from "../CharacterSheetItemDescription.svelte";
   import CharacterSheetItemFooter from "../CharacterSheetItemFooter.svelte";
   import CharacterSheetItemRarity from "../CharacterSheetItemRarity.svelte";
   import CharacterSheetItemTradition from "../CharacterSheetItemTradition.svelte";
   import CharacterCheckLabelLong from "../../checks/CharacterCheckLabelLong.svelte";
   import SpellAspectTags from "~/helpers/svelte-components/tag/SpellAspectTags.svelte";

   // Reference to the application
   const application = getContext("external").application;

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
   <div class="actor-spell">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <CharacterSheetItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Cast Spell-->
            <div>
               <CharacterCheckButtonSmall
                  check={item.system.castingCheck}
                  on:click={() => {
                     application.rollCastingCheck(id);
                  }}
               />
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
            <!--Item Check Data-->
            <div class="item-expandable-content">
               <CharacterCheckLabelLong check={item.system.castingCheck} />
            </div>

            {#if item.aspect}
               <div class="item-expandable-content">
                  <SpellAspectTags aspects={item.aspect} />
               </div>
            {/if}

            <!--Item Description-->
            <div class="item-expandable-content">
               <CharacterSheetItemDescription description={"Temporary Item Description"} />
            </div>

            <!--Footer-->
            <div class="item-expandable-content">
               <CharacterSheetItemFooter>
                  <CharacterSheetItemRarity {item} />
                  <CharacterSheetItemTradition {item} />
               </CharacterSheetItemFooter>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .actor-spell {
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
