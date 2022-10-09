<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import AttributeCheckChatHeader from "./AttributeCheckChatHeader.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const check = $document.flags.titan.chatContext;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttributeCheckChatHeader {check} />
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults />
   </div>
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .check-chat-message {
      @include flex-column;
      @include flex-group-top;
      width: 100%;

      .section {
         @include flex-row;
         @include flex-group-center;
         width: 100%;

         &:not(:first-child):not(.tags) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
