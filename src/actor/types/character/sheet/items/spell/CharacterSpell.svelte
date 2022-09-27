<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import CharacterItemExpandButton from "../CharacterItemExpandButton.svelte";
   import CharacterCheckButtonSmall from "../../checks/CharacterCheckButtonSmall.svelte";
   import CharacterItemSendToChatButton from "../CharacterItemSendToChatButton.svelte";
   import CharacterItemEditButton from "../CharacterItemEditButton.svelte";
   import CharacterItemDeleteButton from "../CharacterItemDeleteButton.svelte";
   import CharacterItemDescription from "../CharacterItemDescription.svelte";
   import CharacterItemFooter from "../CharacterItemFooter.svelte";
   import CharacterItemRarity from "../CharacterItemRarity.svelte";
   import CharacterItemTradition from "../CharacterItemTradition.svelte";
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
         <CharacterItemExpandButton {item} bind:isExpanded />

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
               <CharacterItemDescription description={"Temporary Item Description"} />
            </div>

            <!--Footer-->
            <div class="item-expandable-content">
               <CharacterItemFooter>
                  <CharacterItemRarity {item} />
                  <CharacterItemTradition {item} />
               </CharacterItemFooter>
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
