<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { getContext } from "svelte";

   export let idx = void 0;

   // Document reference
   const document = getContext("DocumentStore");

   function getLabel(base, expertiseApplied) {
      if (expertiseApplied > 0) {
         return `${base} + ${expertiseApplied}`;
      } else {
         return `${base}`;
      }
   }

   function getDieClass(final) {
      const success = final >= $document.flags.titan.chatContext.parameters.difficulty;
      const criticalSuccess = final >= 6;
      const criticalFailure = final === 1;
      if (criticalSuccess) {
         return "critical-success";
      } else if (success) {
         return "success";
      } else if (criticalFailure) {
         return "critical-failure";
      } else {
         return "failure";
      }
   }

   $: label = getLabel(
      $document.flags.titan.chatContext.results.dice[idx].base,
      $document.flags.titan.chatContext.results.dice[idx].expertiseApplied
   );
   $: dieClass = getDieClass($document.flags.titan.chatContext.results.dice[idx].final);
   $: disabled =
      $document.flags.titan.chatContext.results.expertiseRemaining === 0 ||
      $document.flags.titan.chatContext.results.dice[idx].final === 6;
</script>

<!-- svelte-ignore missing-declaration -->
<button
   class={dieClass}
   on:mousedown={preventDefault}
   use:ripple()
   {disabled}
   on:click={() => {
      const check = $document.flags.titan.chatContext;

      // Increase the expertese applied
      if (!check.results.dice[idx].expertiseApplied) {
         check.results.dice[idx].expertiseApplied = 1;
      } else {
         check.results.dice[idx].expertiseApplied += 1;
      }
      check.results.dice[idx].final += 1;

      // Update the expertise reimaining
      check.results.expertiseRemaining -= 1;

      // If the result became a success
      if (!check.results.dice[idx].success && check.results.dice[idx].final >= check.parameters.difficulty) {
         // Update the number of successes
         check.results.dice[idx].success = true;
         const successIncrement = 1;

         // Update whether this is a critical success
         if (check.results.dice[idx].final === 6) {
            check.results.dice[idx].criticalSuccess = true;

            if (check.parameters.extraSuccessOnCritical) {
               successIncrement = 2;
            }
         }
         check.results.successes += successIncrement;

         // Update the number of extra successes
         if (check.results.successes > check.parameters.complexity) {
            check.results.extraSuccesses = check.results.successes - check.results.complexity;
         }

         // Update damage
         if (check.parameters.isDamage) {
            check.results.damage = stat += successIncrement;
         }

         // Update healing
         if (check.parameters.isHealing) {
            check.results.healing += successIncrement;
         }

         /// To do : add healing mod to casting and item checks
         // Add options menu to all check types

         // If the check became a success
         if (!check.results.succeeded && check.results.successes >= check.parameters.complexity) {
            // Set the check to be a success
            check.results.succeeded = true;
         }
      }

      // Update the document
      $document.update({
         flags: $document.flags,
      });
   }}
>
   {label}
</button>

<style lang="scss">
   @import "../../styles/Mixins.scss";

   button {
      @include border;
      @include flex-row;
      @include flex-group-center;
      @include font-size-large;
      padding: 0.25rem;
      font-weight: bold;
      height: 2.5rem;
      min-width: 2.5rem;
      flex-basis: content;
      position: relative;
      overflow: hidden;
      clip-path: var(--tjs-icon-button-clip-path, none);
      transform-style: preserve-3d;

      &:disabled {
         cursor: default;
      }

      &:hover {
         &:not(:disabled) {
            clip-path: var(--tjs-icon-button-clip-path-hover, var(--tjs-icon-button-clip-path, none));
         }
      }

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
</style>
