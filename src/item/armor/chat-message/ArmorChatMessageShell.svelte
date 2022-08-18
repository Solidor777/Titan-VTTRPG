<script>
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatRarityValue from "~/item/chat-message/ItemChatRarityValue.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import ArmorChatStats from "./ArmorChatStats.svelte";
</script>

<div class="armor-chat-message">
   <ItemChatLabel />
   <div class="info-container">
      <div class="info">
         <ArmorChatStats />
      </div>
      <div class="info">
         <ItemChatDescription />
      </div>
      <div class="info">
         <ItemChatRarityValue />
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .armor-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .info-container {
         width: 100%;
         .info {
            &:not(:first-child) {
               @include border-top;
            }
         }
      }
   }
</style>
