<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/item/chat-message/ItemChatChecks.svelte';
   import ItemChatLabel from '~/item/chat-message/ItemChatLabel.svelte';
   import ArmorChatStats from './ArmorChatStats.svelte';

   // Chat context reference
   const document = getContext('DocumentStore');
   const item = $document.flags.titan;
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item} />
   </div>

   <div class="sections">
      <!--Armor stat-->
      <div class="section tags">
         <ArmorChatStats {item} />
      </div>

      <!--Description-->
      {#if item.system.description !== '' && item.system.description !== '<p></p>'}
         <div class="section rich-text">
            <RichText text={item.system.description} />
         </div>
      {/if}

      <!--Checks-->
      {#if item.system.check.length > 0}
         <div class="section">
            <ItemChatChecks {item} />
         </div>
      {/if}
   </div>
</div>

<style lang="scss">
   @import '../../../../styles/Mixins.scss';
   @import '../../../../styles/Variables.scss';

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
            }

            &:not(.tags) {
               @include flex-column;
               @include flex-group-top;
            }
         }
      }
   }
</style>
