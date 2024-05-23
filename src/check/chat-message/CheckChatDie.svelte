<script>
   import preventDefault from '~/helpers/svelte-actions/PreventDefault.js';
   import { getContext } from 'svelte';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';

   export let idx = void 0;

   // Document reference
   const document = getContext('document');

   /**
    * @param base
    * @param expertiseApplied
    */
   function getLabel(base, expertiseApplied) {
      if (expertiseApplied > 0) {
         return `${base} + ${expertiseApplied}`;
      }
      else {
         return `${base}`;
      }
   }

   /**
    * @param final
    */
   function getDieClass(final) {
      const success = final >= $document.flags.titan.parameters.difficulty;
      const criticalSuccess = final >= 6;
      const criticalFailure = final === 1;
      if (criticalSuccess) {
         return 'critical-success';
      }
      else if (success) {
         return 'success';
      }
      else if (criticalFailure) {
         return 'critical-failure';
      }
      else {
         return 'failure';
      }
   }

   /**
    *
    */
   function applyExpertise() {
      // If expertise can be applied
      if (
         $document.flags.titan.results.expertiseRemaining > 0 &&
         $document.flags.titan.results.dice[idx].final < 6
      ) {
         // Add the expertise
         $document.flags.titan.results.dice[idx].final += 1;
         if ($document.flags.titan.results.dice[idx].expertiseApplied) {
            $document.flags.titan.results.dice[idx].expertiseApplied += 1;
         }
         else {
            $document.flags.titan.results.dice[idx].expertiseApplied = 1;
         }
         $document.flags.titan.results.expertiseRemaining -= 1;

         // Recalculate the results
         $document.flags.titan.results = recalculateCheckResults(
            $document.flags.titan,
         );

         // Update the document
         $document.update({
            flags: {
               titan: {
                  results: $document.flags.titan.results,
               },
            },
         });
      }
   }

   $: label = getLabel(
      $document.flags.titan.results.dice[idx].base,
      $document.flags.titan.results.dice[idx].expertiseApplied,
   );
   $: dieClass = getDieClass($document.flags.titan.results.dice[idx].final);
   $: disabled =
      !$document.constructor.getSpeakerActor($document.speaker)?.isOwner ||
      $document.flags.titan.results.expertiseRemaining === 0 ||
      $document.flags.titan.results.dice[idx].final === 6;
</script>

<button
   class={dieClass}
   on:mousedown={preventDefault}
   {disabled}
   on:click={() => {
      applyExpertise();
   }}
>
   {label}
</button>

<style lang="scss">
   button {
      @include border;
      @include flex-row;
      @include flex-group-center;
      @include font-size-large;
      @include label;
      padding: var(--padding-standard);
      font-weight: bold;
      height: 40px;
      min-width: 40px;
      flex-basis: content;
      color: var(--button-color);

      &:disabled {
         cursor: default;
      }

      &.critical-success {
         background: var(--critical-success-color);
      }

      &.success {
         background: var(--success-color);
      }

      &.failure {
         background: var(--failure-color);
      }

      &.critical-failure {
         background: var(--critical-failure-color);
      }
   }
</style>
