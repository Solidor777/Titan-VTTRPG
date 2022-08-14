<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Results
   let results = $document.flags.titan.data.chatContext.results;
</script>

<div class="results">
   <!--Successes-->
   <div class="successes">
      {results.successes}
      {localize(`LOCAL.successes.label`)}
   </div>

   {#if results.succeeded}
      <!--Succeeded-->
      <div class="result succeeded">
         {localize(`LOCAL.succeeded.label`)}
      </div>
      <!--Extra Successes-->
      {#if results.extraSuccesses}
         <div class="extra-successes">
            {results.extraSuccesses}
            {localize(`LOCAL.extraSuccesses.label`)}
         </div>
      {/if}
   {:else if results.failed}
      <!--Failed-->
      <div class="result failed">
         {localize(`LOCAL.failed.label`)}
      </div>
   {/if}

   <!--Expertise Remaining-->
   {#if results.expertiseRemaining}
      <div class="expertise-remaining">
         {results.expertiseRemaining}
         {localize(`LOCAL.expertiseRemaining.label`)}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      width: 100%;
      padding: 0.5rem;
      background-color: var(--label-background-color);

      :not(:first-child) {
         margin-top: 0.25rem;
      }

      .successes {
         font-weight: bold;
         font-size: 1rem;
      }

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

      .extra-successes {
         font-weight: bold;
         font-size: 1rem;
      }

      .expertise-remaining {
         font-weight: bold;
         font-size: 1rem;
      }
   }
</style>
