<script>
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import RarityTag from '~/helpers/svelte-components/tag/RarityTag.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
   import StatTag from '~/helpers/svelte-components/tag/StatTag.svelte';
   import Tag from '~/helpers/svelte-components/tag/Tag.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The titan flags data for the item. */
   const item = $document.flags.titan;

   /** @type {SpellAspect[]} List of enabled Spell Aspects. */
   const enabledAspects = item.system.aspect.filter((aspect) => aspect.enabled);
</script>

<ItemChatMessageShell {item}>
   <!--Casting check-->
   <div class="section">
      <AttributeCheckTag
         attribute={item.castingCheck.attribute}
         complexity={item.castingCheck.complexity}
         difficulty={item.castingCheck.difficulty}
         skill={item.castingCheck.skill}
      />
   </div>

   <!--Aspects-->
   {#if enabledAspects.length > 0 || item.customAspect.length > 0}
      <div class="section small-text tags">
         <SpellAspectTags
            standardAspects={enabledAspects}
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
   {#if item.description && item.description !== '' && item.description !== '<p></p>'}
      <div class="section rich-text">
         <RichText value={item.description}/>
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
         <div class="tag">
            <Tag tooltip={trait.description}>
               {trait.name}
            </Tag>
         </div>
      {/each}
   </div>
</ItemChatMessageShell>

<style lang="scss">
   .section {
      width: 100%;

      &:not(.rich-text) {
         padding-bottom: var(--titan-spacing-large);

         &:not(.tags) {
            padding-top: var(--titan-spacing-large);
         }
      }

      &:last-child {
         padding-bottom: var(--titan-spacing-standard);
      }

      &:not(:first-child) {
         @include border-top;
      }

      &.tags {
         @include flex-row;
         @include flex-group-center;

         flex-wrap: wrap;

         .tag {
            @include tag-container-child-margin;
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
</style>
