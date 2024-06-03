<script>
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltip from '~/helpers/svelte-actions/Tooltip.js';
   import {DICE_ICON, EXPERTISE_ICON} from '~/system/Icons.js';

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

   /** @type string Tooltip to show for the die. */
   let dieTooltip = disabled ? '' : `<p>${localize('dieButton.desc')}</p>`;
   if (die.expertiseApplied) {
      dieTooltip += `<p><i class="${DICE_ICON}"></i> ${localize('roll')}: ${die.base}</p>`;
      dieTooltip += `<p><i class="${EXPERTISE_ICON}"></i> ${localize('expertise')}: ${die.expertiseApplied}</p>`;
   }

</script>

<div class={`die ${result}`} use:tooltip={dieTooltip}>
   <Button {disabled} on:click={applyExpertise}>
      {label}
   </Button>
</div>

<style lang="scss">
   .die {
      height: 35px;
      min-width: 35px;

      --titan-button-border-radius: var(--titan-border-radius);
      --titan-button-height: 100%;
      --titan-button-width: 100%;

      &:disabled {
         cursor: default;
      }

      &.critical-success {
         --titan-button-background: var(--titan-critical-success-color);
         --titan-button-background-disabled: var(--titan-critical-success-color);
      }

      &.success {
         --titan-button-background: var(--titan-success-color);
         --titan-button-background-disabled: var(--titan-success-color);
      }

      &.failure {
         --titan-button-background: var(--titan-failure-color);
         --titan-button-background-disabled: var(--titan-failure-color);
      }

      &.critical-failure {
         --titan-button-background: var(--titan-critical-failure-color);
         --titan-button-background-disabled: var(--titan-critical-failure-color);
      }
   }
</style>
