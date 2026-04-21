<script>
   import ItemChatLabel from '~/document/types/item/chat-message/ItemChatLabel.svelte';

   /** @type {object} The titan flags data for the item. */
   export let item = void 0;
</script>

<div class="item-chat-message">
   <!--Header-->
   <div class="header">
      <ItemChatLabel {item}/>
   </div>

   <div class="sections">
      <slot/>
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
