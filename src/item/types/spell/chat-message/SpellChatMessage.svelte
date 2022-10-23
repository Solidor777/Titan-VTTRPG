<script>
   import { getContext } from "svelte";
   import { localize } from "~/helpers/Utility.js";
   import RichText from "~/helpers/svelte-components/RichText.svelte";
   import RarityTag from "~/helpers/svelte-components/tag/RarityTag.svelte";
   import AttributeTag from "~/helpers/svelte-components/tag/AttributeTag.svelte";
   import ItemChatChecks from "~/item/chat-message/ItemChatChecks.svelte";
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import SpellAspectTags from "~/helpers/svelte-components/tag/SpellAspectTags.svelte";
   import StatTag from "~/helpers/svelte-components/tag/StatTag.svelte";
   import Tag from "~/helpers/svelte-components/tag/Tag.svelte";

   // Chat context reference
   const document = getContext("DocumentStore");
   const item = $document.flags.titan.chatContext;
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item} />
   </div>

   <div class="sections">
      <div class="section">
         <AttributeTag
            attribute={item.system.castingCheck.attribute}
            label={`${localize(item.system.castingCheck.attribute)} (${localize(item.system.castingCheck.skill)}) ${
               item.system.castingCheck.difficulty
            }:${item.system.castingCheck.complexity}`}
         />
      </div>

      <!--Aspects-->
      {#if item.system.aspect.length > 0 || item.system.customAspect.length > 0}
         <div class="section small-text tags">
            <SpellAspectTags standardAspects={item.system.aspect} customAspects={item.system.customAspect} />
         </div>
      {/if}

      <!--Checks-->
      {#if item.system.check.length > 0}
         <div class="section">
            <ItemChatChecks {item} />
         </div>
      {/if}

      <!--Description-->
      {#if item.system.description !== "" && item.system.description !== "<p></p>"}
         <div class="section rich-text">
            <RichText text={item.system.description} />
         </div>
      {/if}

      <!--Footer-->
      <div class="section tags">
         <!--Rarity-->
         <div class="tag">
            <RarityTag rarity={item.system.rarity} />
         </div>

         <!--Tradition-->
         <div class="tag">
            <StatTag label={localize("tradition")} value={item.system.tradition} />
         </div>

         <!--Custom Traits-->
         {#each item.system.customTrait as trait}
            <div class="tag" data-tooltip={trait.description}>
               <Tag label={trait.name} />
            </div>
         {/each}
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../../styles/Mixins.scss";
   @import "../../../../styles/Variables.scss";

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
               padding-bottom: 0.5rem;

               &:not(.tags) {
                  padding-top: 0.5rem;
               }
            }

            &:last-child {
               padding-bottom: 0.25rem;
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
