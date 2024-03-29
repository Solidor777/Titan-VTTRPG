<script>
   import { getContext } from 'svelte';
   import { slide } from 'svelte/transition';
   import { localize } from '~/helpers/Utility.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import CharacterSheetItemExpandButton from '~/actor/types/character/sheet/items/CharacterSheetItemExpandButton.svelte';
   import CharacterSheetItemSendToChatButton from '~/actor/types/character/sheet/items/CharacterSheetItemSendToChatButton.svelte';
   import CharacterSheetItemEditButton from '~/actor/types/character/sheet/items/CharacterSheetItemEditButton.svelte';
   import CharacterSheetItemDeleteButton from '~/actor/types/character/sheet/items/CharacterSheetItemDeleteButton.svelte';
   import CharacterSheetItemImage from '~/actor/types/character/sheet/items/CharacterSheetItemImage.svelte';
   import CharacterSheetCheckButton from '~/actor/types/character/sheet/CharacterSheetCheckButton.svelte';
   import CharacterSheetSpellCastingCheck from './CharacterSheetSpellCastingCheck.svelte';
   import CharacterSheetItemChecks from '~/actor/types/character/sheet/items/CharacterSheetItemChecks.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Reference to the docuement
   const document = getContext('DocumentStore');

   // Reference to the weapon id
   export let id = void 0;

   // Collapsed object
   export let isExpanded = void 0;

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
            <!--Cast Spell-->
            <div>
               <CharacterSheetCheckButton
                  check={item.system.castingCheck}
                  diceMod={$document.typeComponent.getCastingCheckMod(
                     'dice',
                     item
                  )}
                  expertiseMod={$document.typeComponent.getCastingCheckMod(
                     'expertise',
                     item
                  )}
                  on:click={() =>
                     $document.typeComponent.rollCastingCheck(
                        { itemId: id },
                        false
                     )}
               />
            </div>

            <!--Send to Chat button-->
            <div
               class="button"
               use:tooltip={{ content: localize('sendToChat') }}
            >
               <CharacterSheetItemSendToChatButton {item} />
            </div>

            <!--Edit Button-->
            <div class="button" use:tooltip={{ content: localize('editItem') }}>
               <CharacterSheetItemEditButton {item} />
            </div>

            <!--Delete Button-->
            <div
               class="button"
               use:tooltip={{ content: localize('deleteItem') }}
            >
               <CharacterSheetItemDeleteButton itemId={item._id} />
            </div>
         </div>
      </div>

      <!--Expandable content-->
      {#if isExpanded === true}
         <div class="expandable-content" transition:slide|local>
            <!--Item Check Data-->
            <div class="section tags">
               <CharacterSheetSpellCastingCheck {item} />
            </div>

            <!--Spell Aspects-->
            {#if item.system.aspect.length > 0}
               <div class="section tags">
                  <SpellAspectTags
                     standardAspects={item.system.aspect}
                     customAspects={item.system.customAspect}
                  />
               </div>
            {/if}

            <!--Item Checks-->
            {#if item.system.check.length > 0}
               <div class="section">
                  <CharacterSheetItemChecks {item} />
               </div>
            {/if}

            <!--Item Description-->
            {#if item.system.description !== '' && item.system.description !== '<p></p>'}
               <div class="section rich-text">
                  <RichText text={item.system.description} />
               </div>
            {/if}

            <!--Footer-->
            <div class="section tags small-text">
               <!--Rarity-->
               <div class="tag">
                  <RarityTag rarity={item.system.rarity} />
               </div>

               <!--Tradition-->
               <div class="tag">
                  <StatTag
                     label={localize('tradition')}
                     value={item.system.tradition}
                  />
               </div>

               <!--XP Cost-->
               {#if item.system.xpCost}
                  <div class="tag">
                     <StatTag
                        label={localize('xpCost')}
                        value={item.system.xpCost}
                     />
                  </div>
               {/if}

               <!--Custom Traits-->
               {#each item.system.customTrait as trait}
                  <div class="tag" use:tooltip={{ content: trait.description }}>
                     <Tag label={trait.name} />
                  </div>
               {/each}
            </div>
         </div>
      {/if}
   </div>
{/if}

<style lang="scss">
   @import '../../../../../../Styles/Mixins.scss';

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
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: 0.5rem;

               &:not(.tags) {
                  padding-top: 0.5rem;
               }
            }

            &:not(:first-child) {
               @include border-top;
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

            &.small-text {
               @include font-size-small;
            }
         }
      }
   }
</style>
