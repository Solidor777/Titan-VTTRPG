<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import AttributeTag from '~/helpers/svelte-components/tag/AttributeTag.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatLabel from '~/document/types/item/chat-message/ItemChatLabel.svelte';
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   // Chat context reference
   const document = getContext('document');
   const item = $document.flags.titan;
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item}/>
   </div>

   <div class="sections">
      <div class="section">
         <AttributeTag
            attribute={item.castingCheck.attribute}
            label={`${localize(item.castingCheck.attribute)} (${localize(
               item.castingCheck.skill,
            )}) ${item.castingCheck.difficulty}:${
               item.castingCheck.complexity
            }`}
         />
      </div>

      <!--Aspects-->
      {#if item.aspect.length > 0 || item.customAspect.length > 0}
         <div class="section small-text tags">
            <SpellAspectTags
               standardAspects={item.aspect}
               customAspects={item.customAspect}
            />
         </div>
      {/if}

      <!--Checks-->
      {#if item.check.length > 0}
         <div class="section">
            <ItemChatChecks {item}/>
         </div>
      {/if}

      <!--Description-->
      {#if item.description !== '' && item.description !== '<p></p>'}
         <div class="section rich-text">
            <RichText text={item.description}/>
         </div>
      {/if}

      <!--Footer-->
      <div class="section tags">
         <!--Rarity-->
         <div class="tag">
            <RarityTag rarity={item.rarity}/>
         </div>

         <!--Tradition-->
         <div class="tag">
            <StatTag
               label={localize('tradition')}
               value={item.tradition}
            />
         </div>

         <!--XP Cost-->
         {#if item.xpCost}
            <div class="tag">
               <StatTag label={localize('xpCost')} value={item.xpCost}/>
            </div>
         {/if}

         <!--Custom Traits-->
         {#each item.customTrait as trait}
            <div class="tag" use:tooltipAction="{trait.description}">
               <Tag label={trait.name}/>
            </div>
         {/each}
      </div>
   </div>
</div>

<style lang="scss">
   .item-chat-message {
      @include flex-column;
      @include font-size-normal;
      @include font-size-small;

      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .sections {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         .section {
            width: 100%;

            &:not(.rich-text) {
               padding-bottom: var(--titan-padding-large);

               &:not(.tags) {
                  padding-top: var(--titan-padding-large);
               }
            }

            &:last-child {
               padding-bottom: var(--titan-padding-standard);
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
         }
      }
   }
</style>
