<script>
   import { getContext } from 'svelte';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ValueTag from '~/helpers/svelte-components/tag/ValueTag.svelte';
   import ItemChatChecks from '~/item/chat-message/ItemChatChecks.svelte';
   import ItemChatLabel from '~/item/chat-message/ItemChatLabel.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import WeaponChatAttacks from './WeaponChatAttacks.svelte';

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
      <!--Attacks-->
      <div class="section">
         <WeaponChatAttacks {item} />
      </div>

      <!--Attack Notes-->
      {#if item.system.attackNotes !== '' && item.system.attackNotes !== '<p></p>'}
         <div class="section rich-text">
            <RichText text={item.system.attackNotes} />
         </div>
      {/if}

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

      <!--Footer-->
      <div class="section tags small-text">
         <!--Rarity-->
         <div class="tag">
            <RarityTag rarity={item.system.rarity} />
         </div>

         <!--Value-->
         {#if item.system.value}
            <div class="tag">
               <ValueTag value={item.system.value} />
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
