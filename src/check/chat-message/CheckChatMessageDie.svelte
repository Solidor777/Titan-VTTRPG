<script>
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
   import Button from "~/helpers/svelte-components/button/Button.svelte";
   import {getContext} from "svelte";

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /** @type CheckDie The individual die being display. */
   export let die = void 0;

   /** @type string The label to display for the die. */
   const label = die.expertiseApplied > 0 ? `${die.base} + ${die.expertiseApplied}` : die.base.toString();

   /** @type string The class to affect the appearance of the die. */
   const result = die.final >= 6 ? 'critical-success' :
      die.final >= $document.flags.titan.parameters.difficulty ? 'success' :
         die.final <= 1 ? 'critical-failure' :
            'failure';

   /**
    * Applies a point of Expertise to the die.
    */
   function applyExpertise() {
      // If expertise can be applied
      if ($document.flags.titan.results.expertiseRemaining > 0 &&
         die.final < 6
      ) {
         // Add the expertise and decrement it from those remaining
         die.final += 1;
         die.expertiseApplied += 1;
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

   /** @type boolean Whether applying Expertise to the die should be disabled. */
   const disabled = !$document.isOwner ||
      $document.flags.titan.results.expertiseRemaining === 0 ||
      die.final >= 6;
</script>

<div class={`die ${result}`}>
   <Button {disabled} on:click={applyExpertise}>
      {label}
   </Button>
</div>

<style lang="scss">
   .die {
      height: 40px;
      min-width: 40px;

      --button-padding: var(--padding-standard);
      --button-border-radius: var(--border-radius);

      &:disabled {
         cursor: default;
      }

      &.critical-success {
         --button-background: var(--critical-success-color);
         --button-background-disabled: var(--critical-success-color);
      }

      &.success {
         --button-background: var(--success-color);
         --button-background-disabled: var(--success-color);
      }

      &.failure {
         --button-background: var(--failure-color);
         --button-background-disabled: var(--failure-color);
      }

      &.critical-failure {
         --button-background: var(--critical-failure-color);
         --button-background-disabled: var(--critical-failure-color);
      }
   }
</style>
