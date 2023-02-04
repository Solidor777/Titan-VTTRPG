<script>
   import { getContext } from "svelte";
   import { slide } from "svelte/transition";
   import { localize } from "~/helpers/Utility.js";
   import tooltip from "~/helpers/svelte-actions/Tooltip.js";
   import RichText from "~/helpers/svelte-components/RichText.svelte";
   import CharacterSheetItemExpandButton from "~/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte";
   import CharacterSheetItemSendToChatButton from "~/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte";
   import CharacterSheetItemEditButton from "~/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte";
   import CharacterSheetItemDeleteButton from "~/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte";
   import CharacterSheetItemImage from "~/actor/types/character/sheet/items/CharacterSheetItemImage.svelte";
   import CharacterSheetCheckButton from "~/actor/types/character/sheet/CharacterSheetCheckButton.svelte";
   import CharacterSheetItemChecks from "~/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";
   import IntegerInput from "~/helpers/svelte-components/input/IntegerInput.svelte";
   import DurationTag from "~/helpers/svelte-components/tag/DurationTag.svelte";

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

   // Setup context references
   const document = getContext("DocumentStore");

   // Item reference
   $: item = $document.items.get(id);
</script>

{#if item}
   <div class="item">
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
            <!--Duration-->
            {#if item.system.duration.type !== "permanent"}
               <div class="field">
                  <div class="label">
                     {localize("turns")}
                  </div>
                  <div class="input">
                     <IntegerInput
                        min={0}
                        bind:value={item.system.duration.remaining}
                        on:change={() => {
                           item.update({
                              system: {
                                 duration: {
                                    remaining: item.system.duration.remaining,
                                 },
                              },
                           });
                        }}
                     />
                  </div>
               </div>
            {:else if item.system.check.length > 0}
               <!--Check-->
               <div>
                  <CharacterSheetCheckButton
                     check={item.system.check[0]}
                     on:click={() => $document.typeComponent.rollItemCheck({ itemId: item._id, checkIdx: 0 }, false)}
                  />
               </div>
            {/if}

            <!--Send to Chat button-->
            <div class="button" use:tooltip={{ content: localize("sendToChat") }}>
               <CharacterSheetItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="button" use:tooltip={{ content: localize("editItem") }}>
               <CharacterSheetItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div class="button" use:tooltip={{ content: localize("deleteItem") }}>
               <CharacterSheetItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="expandable-content" transition:slide|local>
            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="section">
                  <CharacterSheetItemChecks {item} />
               </div>
            {/if}

            <!--Item Description-->
            {#if item.system.description !== "" && item.system.description !== "<p></p>"}
               <div class="section rich-text">
                  <RichText text={item.system.description} />
               </div>
            {/if}

            <div class="section tags small-text">
               <!--Duration-->
               <div class="tag">
                  <DurationTag type={item.system.duration.type} remaining={item.system.duration.remaining} />
               </div>

               <!--Expired-->
               {#if item.system.duration.type !== "permanent" && item.system.duration.remaining <= 0}
                  <div class="tag">
                     <Tag label={localize("expired")} />
                  </div>
               {/if}

               <!--Traits-->
               {#if item.system.customTrait.length > 0}
                  {#each item.system.customTrait as trait}
                     <div class="tag" use:tooltip={{ content: trait.description }}>
                        <Tag label={trait.name} />
                     </div>
                  {/each}
               {/if}
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

            .field {
               @include flex-row;
               @include flex-group-center;

               .label {
                  margin-right: 0.25rem;
               }

               .input {
                  width: 2rem;
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
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: 0.5rem;

               &:not(.tags) {
                  padding-top: 0.5rem;
               }
            }

            &.tags {
               @include flex-row;
               @include flex-group-center;
               flex-wrap: wrap;

               .tag {
                  @include tag-margin;
               }
            }

            &:not(.tags) {
               @include flex-column;
               @include flex-group-top;
            }

            &:not(:first-child) {
               @include border-top;
            }

            &.small-text {
               @include font-size-small;
            }
         }
      }
   }
</style>
