<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";
   import CheckChatResetExpertiseButton from "./CheckChatResetExpertiseButton.svelte";
   import recalculateCheckResults from "./RecalculateCheckResults";

   // Document reference
   const document = getContext("DocumentStore");
</script>

<div class="results">
   <!--Successes-->
   <div class="stat">
      {$document.flags.titan.chatContext.results.successes}
      {localize(`successes`)}
   </div>

   <!--Succeeded-->
   {#if $document.flags.titan.chatContext.results.succeeded}
      <div class="result succeeded">
         {localize(`succeeded`)}
      </div>

      <!--Extra Successes-->
      {#if $document.flags.titan.chatContext.results.extraSuccesses !== undefined}
         {#if $document.flags.titan.chatContext.results.extraSuccessesRemaining !== undefined}
            <div class="stat">
               {localize(`extraSuccesses`)}: {$document.flags.titan.chatContext.results
                  .extraSuccessesRemaining}/{$document.flags.titan.chatContext.results.extraSuccesses}
            </div>
         {:else if $document.flags.titan.chatContext.results.extraSuccesses > 0}
            <div class="stat">
               {localize(`extraSuccesses`)}: {$document.flags.titan.chatContext.results.extraSuccesses}
            </div>
         {/if}
      {/if}
   {:else if $document.flags.titan.chatContext.parameters.complexity > 0}
      <!--Failed-->
      <div class="result failed">
         {localize(`failed`)}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if $document.flags.titan.chatContext.parameters.totalExpertise}
      <div class="stat">
         <i class="fas fa-graduation-cap" />
         {localize(`expertiseRemaining`)}:
         {$document.flags.titan.chatContext.results.expertiseRemaining}

         <!--Reset Button-->
         {#if $document.constructor.getSpeakerActor($document.speaker)?.isOwner}
            <div class="button">
               <CheckChatResetExpertiseButton />
            </div>
         {/if}
      </div>
   {/if}

   <!--Damage-->
   {#if $document.flags.titan.chatContext.results.succeeded}
      {#if $document.flags.titan.chatContext.results.damage > 0}
         <div class="stat">
            <i class="fas fa-bolt" />
            {localize(`damage`)}:
            {$document.flags.titan.chatContext.results.damage}
         </div>
      {/if}

      <!--Healing-->
      {#if $document.flags.titan.chatContext.results.healing > 0}
         <div class="stat">
            <i class="fas fa-heart" />
            {localize(`healing`)}:
            {$document.flags.titan.chatContext.results.healing}
         </div>
      {/if}
   {/if}

   <!--Rerolled failires-->
   {#if $document.flags.titan.chatContext.failuresReRolled}
      <div class="stat">
         <i class="fas fa-dice" />
         {localize(`failuresReRolled`)}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      @include label;
      @include font-size-normal;
      font-weight: bold;
      width: 100%;
      padding: 0.5rem;

      .result {
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;
         width: 100%;
         font-weight: bold;
         &.succeeded {
            color: var(--succeeded-color-dark);
         }

         &.failed {
            color: var(--failed-color-dark);
         }
      }

      .stat {
         @include flex-row;
         @include flex-group-center;
         &:not(:first-child) {
            margin-top: 0.25rem;
         }

         i {
            margin-right: 0.25rem;
         }

         .button {
            margin-left: 0.25rem;
            --icon-button-radius: 1.5rem;
            --icon-button-font-size: 0.9rem;
         }
      }
   }
</style>
