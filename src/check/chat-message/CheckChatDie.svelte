<script>
   import { preventDefault } from "~/helpers/svelte-actions/PreventDefault.js";
   import { ripple } from "@typhonjs-fvtt/svelte-standard/action";
   import { getContext } from "svelte";
   import recalculateCheckResults from "./RecalculateCheckResults";

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

   function applyExpertise() {
      // If expertise can be applied
      if (
         $document.flags.titan.chatContext.results.expertiseRemaining > 0 &&
         $document.flags.titan.chatContext.results.dice[idx].final < 6
      ) {
         // Add the expertise
         $document.flags.titan.chatContext.results.dice[idx].final += 1;
         if ($document.flags.titan.chatContext.results.dice[idx].expertiseApplied) {
            $document.flags.titan.chatContext.results.dice[idx].expertiseApplied += 1;
         } else {
            $document.flags.titan.chatContext.results.dice[idx].expertiseApplied = 1;
         }
         $document.flags.titan.chatContext.results.expertiseRemaining -= 1;

         // Recalculate the results
         $document.flags.titan.chatContext.results = recalculateCheckResults($document.flags.titan.chatContext);

         // Update the document
         $document.update({
            flags: {
               titan: {
                  chatContext: {
                     results: $document.flags.titan.chatContext.results,
                  },
               },
            },
         });
      }
   }

   $: label = getLabel(
      $document.flags.titan.chatContext.results.dice[idx].base,
      $document.flags.titan.chatContext.results.dice[idx].expertiseApplied
   );
   $: dieClass = getDieClass($document.flags.titan.chatContext.results.dice[idx].final);
   $: disabled =
      !$document.constructor.getSpeakerActor($document.speaker)?.isOwner ||
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
      applyExpertise();
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
      color: var(--button-text-color);

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
