<script>
   // Check reference
   export let dice = void 0;

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
   @import "../../styles/Mixins.scss";

   .container {
      @include flex-row;
      @include flex-group-center;
      width: 100%;
      flex-wrap: wrap;

      .die {
         @include border;
         @include flex-row;
         @include flex-group-center;
         @include font-size-large;
         @include tag-margin;
         padding: 0.25rem;
         font-weight: bold;
         height: 2.5rem;
         min-width: 2.5rem;

         &.critical-success {
            background: var(--critical-success-color-bright);
         }

         &.success {
            background: var(--success-color-bright);
         }

         &.failure {
            background: var(--failure-color-bright);
         }

         &.critical-failure {
            background: var(--critical-failure-color-bright);
         }
      }
   }
</style>
