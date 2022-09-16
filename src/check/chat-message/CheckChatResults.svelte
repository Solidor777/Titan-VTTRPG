<script>
   import { localize } from "~/helpers/Utility.js";
   import { getContext } from "svelte";

   // Results
   const document = getContext("DocumentStore");
   let results = $document.flags.titan.chatContext.results;
</script>

<div class="results">
   <!--Successes-->
   <div class="stat">
      {results.successes}
      {localize(`successes`)}
   </div>

   {#if results.succeeded}
      <!--Succeeded-->
      <div class="result succeeded">
         {localize(`succeeded`)}
      </div>
      <!--Extra Successes-->
      {#if results.extraSuccesses !== undefined}
         <div class="stat">
            {localize(`extraSuccesses`)}:
            {#if results.extraSuccessesRemaining != undefined}
               {results.extraSuccessesRemaining}/{results.extraSuccesses}
            {:else}
               {results.extraSuccesses}
            {/if}
         </div>
      {/if}
   {:else if results.failed}
      <!--Failed-->
      <div class="result failed">
         {localize(`failed`)}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if results.expertiseRemaining}
      <div class="stat">
         {localize(`expertiseRemaining`)}:
         {results.expertiseRemaining}
      </div>
   {/if}

   <!--Damage-->
   {#if results.damage !== undefined}
      <div class="stat">
         {localize(`damage`)}:
         {results.damage}
      </div>
   {/if}

   <!--Healing-->
   {#if results.healing !== undefined}
      <div class="stat">
         {localize(`healing`)}:
         {results.healing}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      font-weight: bold;
      font-size: 1rem;
      width: 100%;
      padding: 0.5rem;
      background: var(--label-background-color);

      .result {
         @include flex-row;
         @include flex-group-center;
         width: 100%;
         font-weight: bold;
         font-size: 1.2rem;

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
