<script>
   import { getContext } from "svelte";
   import ItemChatLabel from "~/item/chat-message/ItemChatLabel.svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatRarity from "~/item/chat-message/ItemChatRarity.svelte";
   import ItemChatTradition from "../../chat-message/ItemChatTradition.svelte";
   import ActorSpellAspects from "../../../actor/sheet/items/ActorSpellAspects.svelte";

   // Chat context reference
   const document = getContext("DocumentSheetObject");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="spell-chat-message">
   <ItemChatLabel />
   <div class="info-container">
      <div class="info">
         <ActorSpellAspects aspects={chatContext.aspects} />
      </div>

      <div class="info">
         <ItemChatDescription />
      </div>

      <div class="info">
         <ItemChatFooter>
            <ItemChatTradition />
            <ItemChatRarity />
         </ItemChatFooter>
      </div>
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";
   @import "../../../styles/Variables.scss";

   .spell-chat-message {
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
