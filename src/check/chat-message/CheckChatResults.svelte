<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Results
   let results = $document.flags.titan.chatContext.results;
</script>

<div class="results">
   <!--Successes-->
   <div class="stat">
      {results.successes}
      {localize(`LOCAL.successes.label`)}
   </div>

   {#if results.succeeded}
      <!--Succeeded-->
      <div class="result succeeded">
         {localize(`LOCAL.succeeded.label`)}
      </div>
      <!--Extra Successes-->
      {#if results.extraSuccesses !== undefined}
         <div class="stat">
            {localize(`LOCAL.extraSuccesses.label`)}:
            {results.extraSuccesses}
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
      <div class="stat">
         {localize(`LOCAL.expertiseRemaining.label`)}:
         {results.expertiseRemaining}
      </div>
   {/if}

   <!--Damage-->
   {#if results.damage !== undefined}
      <div class="stat">
         {localize(`LOCAL.damage.label`)}:
         {results.damage}
      </div>
   {/if}

   <!--Healing-->
   {#if results.healing !== undefined}
      <div class="stat">
         {localize(`LOCAL.healing.label`)}:
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
      background-color: var(--label-background-color);

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
