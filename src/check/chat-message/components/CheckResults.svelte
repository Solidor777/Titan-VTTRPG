<script>
   import { localize } from "@typhonjs-fvtt/runtime/svelte/helper";

   // Results
   export let results = void 0;
</script>

<div class="results">
   <!--Successes-->
   <div class="successes">
      {results.successes}
      {localize(`LOCAL.successes.label`)}
   </div>

   {#if results.success}
      <!--Succeeded-->
      <div class="result succeeded">
         {localize(`LOCAL.succeeded.label`)}
      </div>
   {:else if results.failed}
      <!--Failed-->
      <div class="result failed">
         {localize(`LOCAL.succeeded.label`)}
      </div>
   {/if}
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .results {
      @include border;
      @include flex-column;
      @include flex-group-center;
      width: 100%;
      padding: 0.5rem;
      background-color: var(--color-label);

      .successes {
         font-weight: bold;
         font-size: 1rem;
      }

      .result {
         @include flex-row;
         width: 100%;
         font-weight: 1.1;
      }
   }
</style>
