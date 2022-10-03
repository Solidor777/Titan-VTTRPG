<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import CharacterSheetItemExpandButton from "../CharacterSheetItemExpandButton.svelte";
   import CharacterCheckButtonSmall from "../../checks/CharacterCheckButtonSmall.svelte";
   import CharacterSheetItemSendToChatButton from "../CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "../CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "../CharacterSheetItemDeleteButton.svelte";
   import RichText from "~/helpers/svelte-components/RichText.svelte";
   import CharacterSheetItemChecks from "../CharacterSheetItemChecks.svelte";
   import CharacterSheetItemFooter from "../CharacterSheetItemFooter.svelte";
   import RarityTag from "~/helpers/svelte-components/tag/RarityTag.svelte";

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
   <div class="actor-ability">
      <!--Header-->
      <div class="item-header">
         <!--Expand button-->
         <CharacterSheetItemExpandButton {item} bind:isExpanded />

         <!--Controls-->
         <div class="item-controls">
            <!--Check-->
            {#if item.system.check.length > 0}
               <div>
                  <CharacterCheckButtonSmall
                     check={item.system.check[0]}
                     on:click={() => {
                        application.rollItemCheck(id, 0);
                     }}
                  />
               </div>
            {/if}

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
               {#if item.system.description !== "" && item.system.description !== "<p></p>"}
                  <div class="section rich-text">
                     <RichText text={item.system.description} />
                  </div>
               {/if}
            </div>

            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="item-expandable-content">
                  <CharacterSheetItemChecks {id} />
               </div>
            {/if}

            <!--Footer-->
            <div class="item-expandable-content">
               <CharacterSheetItemFooter>
                  <!-- Rarity-->
                  <RarityTag rarity={item.system.rarity} />

                  <!--Action-->
                  {#if item.system.action}
                     <Tag label={localize("action")} />
                  {/if}

                  <!--Reaction-->
                  {#if item.system.reaction}
                     <Tag label={localize("reaction")} />
                  {/if}

                  <!--Passive-->
                  {#if item.system.passive}
                     <Tag label={localize("passive")} />
                  {/if}
               </CharacterSheetItemFooter>
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import "../../../../../../Styles/Mixins.scss";

   .actor-ability {
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
