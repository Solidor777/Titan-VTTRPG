<script>
   import ItemChatLabel from '~/document/types/item/chat-message/ItemChatLabel.svelte';

   /**
    * @typedef {object} ItemChatMessageShellProps
    * @property {object} [item] - The titan flags data for the item.
    * @property {import('svelte').Snippet} [children] - Content to render in the sections area.
    */

   /** @type {ItemChatMessageShellProps} */
   const { item = void 0, children } = $props();
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item}/>
   </div>

   <div class="sections">
      {@render children?.()}
   </div>
</div>

<style lang="scss">
   .item-chat-message {
      @include flex-column;
      @include font-size-normal;

      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }

   .sections {
      @include flex-column;
      @include flex-group-top;

      width: 100%;
   }
</style>
