<script>
   import { getContext } from "svelte";
   const document = getContext("DocumentSheetObject");

   // Results
   let dice = $document.flags.titan.data.chatContext.results.dice;

   function getDieTypeClass(die) {
      if (die.criticalSuccess) {
         return "critical-success";
      } else if (die.success) {
         return "success";
      } else if (die.criticalFailure) {
         return "critical-failure";
      } else {
         return "failure";
      }
   }

   function getDieNumber(die) {
      if (die.expertiseApplied) {
         return `${die.base} + ${die.expertiseApplied}`;
      } else {
         return `${die.base}`;
      }
   }
</script>

<div class="container">
   <!--For each dice-->
   {#each dice as die}
      <div class="die {getDieTypeClass(die)}">
         {getDieNumber(die)}
      </div>
   {/each}
</div>

<style lang="scss">
   @import "../../../styles/Mixins.scss";

   .container {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;
      padding: 0.5rem;

      .die {
         @include border-normal;
         @include flex-row;
         @include flex-group-center;
         font-size: 1.2rem;
         font-weight: bold;
         padding: 0.25rem;
         height: 2.5rem;
         min-width: 2.5rem;
         margin: 0.25rem;

         &.critical-success {
            background-color: var(--color-critical-success-bright);
         }

         &.success {
            background-color: var(--color-success-bright);
         }

         &.failure {
            background-color: var(--color-failure-bright);
         }

         &.critical-failure {
            background-color: var(--color-critical-failure-bright);
         }
      }
   }
</style>
