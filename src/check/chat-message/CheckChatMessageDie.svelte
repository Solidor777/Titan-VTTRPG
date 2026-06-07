<script>
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults.js';
   import Button from '~/helpers/svelte-components/button/Button.svelte';
   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import tooltipAction from '~/helpers/svelte-actions/TooltipAction.js';
   import { DICE_ICON, EXPERTISE_ICON } from '~/system/Icons.js';

   /**
    * @typedef {object} CheckChatMessageDieProps
    * @property {CheckDie} [die] - The individual die being displayed.
    * @property {number} [idx] - Index of the die in the check results' dice array.
    */

   /** @type {CheckChatMessageDieProps} */
   let {
      die = undefined,
      idx = undefined,
   } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} The label to display for the die. */
   const label = $derived(
      die.expertiseApplied > 0 ? `${die.base} + ${die.expertiseApplied}` : die.base.toString(),
   );

   /** @type {string} The class to affect the appearance of the die. */
   const result = $derived(
      die.final >= 6 ? 'critical-success' :
         die.final >= document.data.system.parameters.difficulty ? 'success' :
            die.final <= 1 ? 'critical-failure' :
               'failure',
   );

   /** @type {boolean} Whether applying Expertise to the die should be disabled. */
   const disabled = $derived(
      !document.data.isOwner ||
      document.data.system.results.expertiseRemaining === 0 ||
      die.final >= 6,
   );

   /** @type {string} Tooltip to show for the die. */
   const dieTooltip = $derived.by(() => {
      // Build the tooltip string.
      let tooltip = disabled ? '' : `<p>${localize('dieButton.desc')}</p>`;
      if (die.expertiseApplied) {
         tooltip += `<p><i class="${DICE_ICON}"></i> ${localize('roll')}: ${die.base}</p>`;
         tooltip += `<p><i class="${EXPERTISE_ICON}"></i> ${localize('expertise')}: ${die.expertiseApplied}</p>`;
      }

      return tooltip;
   });

   /**
    * Applies a point of Expertise to the die. Mutates a detached system clone only — the live
    * DataModel is never written; the update round-trip re-renders the card.
    */
   function applyExpertise() {
      // Clone the system data and address this die in the clone.
      const system = document.data.system.toObject();
      const clonedDie = system.results.dice[idx];

      // If expertise can be applied.
      if (system.results.expertiseRemaining > 0 && clonedDie.final < 6) {
         // Add the expertise and decrement it from those remaining.
         clonedDie.final += 1;
         clonedDie.expertiseApplied += 1;
         system.results.expertiseRemaining -= 1;

         // Recalculate the results, passing the message type for type-specific recalculation.
         const results = recalculateCheckResults(
            {
               type: document.data.type,
               parameters: system.parameters,
               results: system.results,
            },
         );

         // Update the document.
         document.data.update({
            system: {
               results: results,
            },
         });
      }
   }

</script>

<div class={`die ${result}`} use:tooltipAction={{
   text: dieTooltip,
   localize: false,
}}>
   <Button {disabled} onclick={applyExpertise}>
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
         --titan-button-background: var(--titan-critical-success-background);
         --titan-button-disabled-background: var(--titan-critical-success-background);
      }

      &.success {
         --titan-button-background: var(--titan-success-background);
         --titan-button-disabled-background: var(--titan-success-background);
      }

      &.failure {
         --titan-button-background: var(--titan-failure-background);
         --titan-button-disabled-background: var(--titan-failure-background);
      }

      &.critical-failure {
         --titan-button-background: var(--titan-critical-failure-background);
         --titan-button-disabled-background: var(--titan-critical-failure-background);
      }
   }
</style>
