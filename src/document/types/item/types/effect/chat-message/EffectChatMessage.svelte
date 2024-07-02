<script>
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatLabel from '~/document/types/item/chat-message/ItemChatLabel.svelte';
   import DurationTag from '~/helpers/svelte-components/tag/DurationTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';

   /** @type object Reference to the Document store. */
   const document = getContext('document');
   const item = $document.flags.titan;
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item}/>
   </div>

   <div class="sections">
      <!--Checks-->
      {#if item.system.check.length > 0}
         <div class="section">
            <ItemChatChecks {item}/>
         </div>
      {/if}

      <!--Description-->
      {#if item.system.description !== '' && item.system.description !== '<p></p>'}
         <div class="section rich-text">
            <RichText value={item.system.description}/>
         </div>
      {/if}

      <div class="section tags small-text">
         <!--Duration-->
         <div class="tag">
            <DurationTag
               remaining={item.system.duration.remaining}
               type={item.system.duration.type}
            />
         </div>

         <!--Expired-->
         {#if item.system.duration.type !== 'permanent' && item.system.duration.remaining <= 0}
            <div class="tag">
               <Tag>{localize('expired')}</Tag>
            </div>
         {/if}

         <!--Traits-->
         {#if item.system.customTrait.length > 0}
            {#each item.system.customTrait as trait}
               <div class="tag">
                  <Tag tooltip={trait.description}>
                     {trait.name}
                  </Tag>
               </div>
            {/each}
         {/if}
      </div>
   </div>
</div>

<style lang="scss">
   .item-chat-message {
      @include flex-column;
      @include font-size-normal;

      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .sections {
         @include flex-column;
         @include flex-group-top;

         width: 100%;

         .section {
            @include flex-column;
            @include flex-group-top;

            width: 100%;

            &:not(.rich-text) {
               padding-bottom: var(--titan-padding-large);

               &:not(.tags) {
                  padding-top: var(--titan-padding-large);
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
