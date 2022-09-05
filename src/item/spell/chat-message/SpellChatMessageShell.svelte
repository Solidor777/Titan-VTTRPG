<script>
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
</script>

<div class="spell-chat-message">
   <ItemChatLabel />
   <div class="info-container">
      <div class="info">
         <ItemChatDescription />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";
</style>
