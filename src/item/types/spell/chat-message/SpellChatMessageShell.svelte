<script>
   import { getContext } from "svelte";
   import ItemChatDescription from "~/item/chat-message/ItemChatDescription.svelte";
   import ItemChatFooter from "~/item/chat-message/ItemChatFooter.svelte";
   import ItemChatRarity from "~/item/chat-message/ItemChatRarity.svelte";
   import ItemChatTradition from "~/item/chat-message/ItemChatTradition.svelte";
   import ItemCheckChatLabel from "~/item/chat-message/ItemCheckChatLabel.svelte";
   import SpellAspectTags from "~/helpers/svelte-components/SpellAspectTags.svelte";

   // Chat context reference
   const document = getContext("DocumentStore");
   const chatContext = $document.flags.titan.chatContext;
</script>

<div class="spell-chat-message">
   <ItemCheckChatLabel />
   <div class="info-container">
      <div class="info">
         <SpellAspectTags aspects={chatContext.aspects} />
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
   @import "../../../../styles/Mixins.scss";
   @import "../../../../styles/Variables.scss";

   .spell-chat-message {
      @include flex-column;
      align-items: flex-start;
      justify-content: center;
      width: 100%;

      .info-container {
         @include flex-column;
         @include flex-group-top;
         width: 100%;

         .info {
            @include flex-row;
            @include flex-group-center;
            width: 100%;
            margin-top: 0.5rem;

            &:not(:first-child) {
               @include border-top;
               padding-top: 0.5rem;
            }
         }
      }
   }
</style>
