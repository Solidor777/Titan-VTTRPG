<script>
   import { getContext } from "svelte";
   import CheckChatDiceContainer from "~/check/chat-message/CheckChatDiceContainer.svelte";
   import CheckChatResults from "~/check/chat-message/CheckChatResults.svelte";
   import CheckChatDamageButtons from "~/check/chat-message/CheckChatDamageButtons.svelte";
   import CheckChatHealingButton from "~/check/chat-message/CheckChatHealingButton.svelte";
   import CheckChatOpposedCheckButton from "~/check/chat-message/CheckChatOpposedCheckButton.svelte";
   import CheckChatResistanceCheckButtons from "~/check/chat-message/CheckChatResistanceCheckButtons.svelte";
   import AttackCheckChatHeader from "./AttackCheckChatHeader.svelte";
   import AttackCheckChatAttackNotes from "./AttackCheckChatAttackNotes.svelte";
   import AttackCheckStats from "./AttackCheckStats.svelte";

   // Document reference
   const document = getContext("DocumentStore");
   const check = $document.flags.titan.chatContext;
</script>

<div class="check-chat-message">
   <!--Header-->
   <div class="section">
      <AttackCheckChatHeader {check} />
   </div>

   <!--Attack Notes-->
   {#if check.parameters.attackNotes !== "" && check.parameters.attackNotes !== "<p></p>"}
      <div class="section rich-text">
         <AttackCheckChatAttackNotes text={check.parameters.attackNotes} />
      </div>
   {/if}

   <!--Stats-->
   <div class="section tags">
      <AttackCheckStats attack={check.parameters.attack} />
   </div>

   <!--Dice Container-->
   <div class="section tags">
      <CheckChatDiceContainer dice={check.results.dice} />
   </div>

   <!--Results-->
   <div class="section">
      <CheckChatResults results={check.results} />
   </div>

   <!--Damage Buttons-->
   <!-- svelte-ignore missing-declaration -->
   {#if check.results.damage !== undefined && game.user.isGM}
      <div class="section">
         <CheckChatDamageButtons results={check.results} />
      </div>
   {/if}

   <!--Healing Button-->
   <!-- svelte-ignore missing-declaration -->
   {#if check.results.healing !== undefined && game.user.isGM}
      <div class="section">
         <CheckChatHealingButton results={check.results} />
      </div>
   {/if}

   <!--Opposed Check Buttons-->
   {#if check.results.succeeded && check.parameters.opposedCheck}
      <div class="section">
         <CheckChatOpposedCheckButton opposedCheck={check.parameters.opposedCheck} />
      </div>
   {/if}

   <!--Resistance Check Buttons-->
   {#if check.results.reflexesCheck || check.results.resilienceCheck || check.results.willpowerCheck}
      <div class="section tags">
         <CheckChatResistanceCheckButtons results={check.results} />
      </div>
   {/if}
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

         &:not(:first-child):not(.tags):not(.rich-text):not(.rich-text + section) {
            margin-top: 0.5rem;
         }
      }
   }
</style>
