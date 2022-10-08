<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

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
         <div class="stat">
            {localize(`extraSuccesses`)}:
            {#if $document.flags.titan.chatContext.results.extraSuccessesRemaining !== undefined}
               {$document.flags.titan.chatContext.results.extraSuccessesRemaining}/{$document.flags.titan.chatContext
                  .results.extraSuccesses}
            {:else}
               {$document.flags.titan.chatContext.results.extraSuccesses}
            {/if}
         </div>
      {/if}
   {:else if $document.flags.titan.chatContext.results.failed}
      <!--Failed-->
      <div class="result failed">
         {localize(`failed`)}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if $document.flags.titan.chatContext.parameters.totalExpertise}
      <div class="stat">
         {localize(`expertiseRemaining`)}:
         {$document.flags.titan.chatContext.results.expertiseRemaining}
      </div>
   {/if}

   <!--Damage-->
   {#if $document.flags.titan.chatContext.results.damage !== undefined}
      <div class="stat">
         {localize(`damage`)}:
         {$document.flags.titan.chatContext.results.damage}
      </div>
   {/if}

   <!--Healing-->
   {#if $document.flags.titan.chatContext.results.healing !== undefined}
      <div class="stat">
         {localize(`healing`)}:
         {$document.flags.titan.chatContext.results.healing}
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
         &:not(:first-child) {
            margin-top: 0.25rem;
         }
      }
   }
</style>
