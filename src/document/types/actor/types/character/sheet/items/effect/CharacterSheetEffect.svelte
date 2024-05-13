<script>
   import {getContext} from 'svelte';
   import {slide} from 'svelte/transition';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import CharacterSheetItemExpandButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';
   import CharacterSheetItemSendToChatButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemImage
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetItemChecks
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import IntegerInput from '~/helpers/svelte-components/input/IntegerInput.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import CharacterSheetItemToggleActiveButton
      from '~/document/types/actor/types/character/sheet/items/CharacterSheetItemToggleActiveButton.svelte';
   import IntegerIncrementInput from '~/helpers/svelte-components/input/IntegerIncrementInput.svelte';

   /** @type {string} The ID of the item. */
   export let id = void 0;

   /** @type {boolean} Whether this Item is currently expanded. */
   export let isExpanded = void 0;

   // Setup context references
   const document = getContext('document');

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
               <CharacterSheetItemImage {item}/>
            </div>

            <!--Expand button-->
            <div class="button">
               <CharacterSheetItemExpandButton {item} bind:isExpanded/>
            </div>
         </div>

         <!--Controls-->
         <div class="controls">
            <!--Duration-->
            {#if item.system.duration.type !== 'permanent'}
               {#if item.system.duration.type === 'initiative'}
                  <!--Initiative-->
                  <div class="field margin-right">
                     <div class="label">
                        {localize('initiative')}
                     </div>
                     <div class="input">
                        <IntegerInput
                           min={0}
                           bind:value={item.system.duration.initiative}
                           on:change={() => {
                              item.update({
                                 system: {
                                    duration: {
                                       initiative:
                                          item.system.duration.initiative,
                                    },
                                 },
                              });
                           }}
                        />
                     </div>
                  </div>
               {/if}

               <div class="field">
                  <div class="label">
                     {item.system.duration.type === 'custom'
                        ? item.system.duration.custom
                        : localize('turns')}
                  </div>

                  <!--Duration input-->
                  <div class="input">
                     <IntegerIncrementInput
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
            {:else}
               <!--Toggle Active Button-->
               <CharacterSheetItemToggleActiveButton {item}/>
            {/if}

            <!--Send to Chat button-->
            <div
               class="button"
               use:tooltip={{ content: localize('sendToChat') }}
            >
               <CharacterSheetItemSendToChatButton {item}/>
            </div>

            <!--Edit Button-->
            <div class="button" use:tooltip={{ content: localize('editItem') }}>
               <CharacterSheetItemEditButton {item}/>
            </div>

            <!--Delete Button-->
            <div
               class="button"
               use:tooltip={{ content: localize('deleteItem') }}
            >
               <CharacterSheetItemDeleteButton itemId={item._id}/>
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="expandable-content" transition:slide|local>
            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="section">
                  <CharacterSheetItemChecks {item}/>
               </div>
            {/if}

            <!--Item Description-->
            {#if item.system.description !== '' && item.system.description !== '<p></p>'}
               <div class="section rich-text">
                  <RichText text={item.system.description}/>
               </div>
            {/if}

            <div class="section tags small-text">
               <!--Duration-->
               <div class="tag">
                  <DurationTag
                     type={item.system.duration.type}
                     remaining={item.system.duration.remaining}
                  />
               </div>

               <!--Expired-->
               {#if item.system.duration.type !== 'permanent' && item.system.duration.remaining <= 0}
                  <div class="tag">
                     <Tag label={localize('expired')}/>
                  </div>
               {/if}

               <!--Traits-->
               {#if item.system.customTrait.length > 0}
                  {#each item.system.customTrait as trait}
                     <div
                        class="tag"
                        use:tooltip={{ content: trait.description }}
                     >
                        <Tag label={trait.name}/>
                     </div>
                  {/each}
               {/if}
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   .item {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .header {
         @include flex-row;
         @include flex-space-between;
         @include border;
         @include panel-1;
         padding: var(--padding-standard);
         width: 100%;
         font-weight: bold;

         .label {
            @include flex-row;
            @include flex-group-center;

            .button {
               margin-left: var(--padding-standard);
            }
         }

         .controls {
            @include flex-row;
            @include flex-group-right;
            height: 100%;

            .button {
               &:not(:first-child) {
                  margin-left: var(--padding-standard);
               }
            }

            .field {
               @include flex-row;
               @include flex-group-center;

               &.margin-right {
                  margin-right: var(--padding-standard);
               }

               .label {
                  margin-right: var(--padding-standard);
               }

               .input {
                  --input-width: 32px;
               }
            }
         }
      }

      .expandable-content {
         @include flex-column;
         @include flex-group-top;
         @include panel-3;
         @include border-bottom-sides;
         width: calc(100% - 16px);
         padding: 0 var(--padding-standard);

         .section {
            @include flex-column;
            @include flex-group-top;
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: var(--padding-large);

               &:not(.tags) {
                  padding-top: var(--padding-large);
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
