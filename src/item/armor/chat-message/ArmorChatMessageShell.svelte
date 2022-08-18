<script>
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import ArmorChatStats from "./ArmorChatStats.svelte";
</script>

Armor
<div class="armor-chat-message">
   <ItemChatLabel />
   <ItemChatDescription />
   <ArmorChatStats />
   <ItemChatFooter />
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .armor-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;
   }
</style>
