<script>
   import { getContext } from 'svelte';
   import RichText from '~/helpers/svelte-components/RichText.svelte';
   import ItemChatChecks from '~/document/types/item/chat-message/ItemChatMessageItemChecks.svelte';
   import ItemChatMessageShell from '~/document/types/item/chat-message/ItemChatMessageShell.svelte';
   import SpellChatAspects from '~/document/types/item/types/spell/chat-message/SpellChatAspects.svelte';
   import SpellChatStats from '~/document/types/item/types/spell/chat-message/SpellChatStats.svelte';
   import AttributeCheckTag from '~/helpers/svelte-components/tag/AttributeCheckTag.svelte';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {object} The item's chat-message system snapshot. */
   const item = document.data.system;
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
   {#if item.aspect.some((aspect) => aspect.enabled) || item.customAspect.length > 0}
      <div class="section">
         <SpellChatAspects {item}/>
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

   <!--Stats-->
   <div class="section">
      <SpellChatStats {item}/>
   </div>
</ItemChatMessageShell>

<style lang="scss">
   .section {
      @include flex-column;
      @include flex-group-top;

      width: 100%;

      &:not(.rich-text) {
         @include padding-bottom-large;
      }

      &:last-child {
         @include padding-bottom-standard;
      }

      &:not(:first-child) {
         @include border-top;
      }
   }
</style>
