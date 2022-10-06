<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import SkillCheckChatHeader from "./SkillCheckChatHeader.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const check = $document.flags.titan.chatContext;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <SkillCheckChatHeader {check} />
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer dice={check.results.dice} />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults results={check.results} />
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
