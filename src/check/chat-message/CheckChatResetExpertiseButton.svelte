<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults.js';
   import { RESET_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Resets all applied Expertise. Mutates a detached system clone only — the live DataModel is never
    * written; the update round-trip re-renders the card.
    */
   function resetExpertise() {
      // Clone the system data.
      const system = document.data.system.toObject();

      // Remove the expertise from each die.
      for (const die of system.results.dice) {
         die.final = die.base;
         die.expertiseApplied = 0;
      }

      // Reset the expertise available and recalculate the check results.
      system.results.expertiseRemaining = system.parameters.totalExpertise;
      const results = recalculateCheckResults(
         {
            type: document.data.type,
            parameters: system.parameters,
            results: system.results,
         },
      );

      document.data.update({
         system: {
            results: results,
         },
      });
   }
</script>

<IconButton
   disabled={!document.data.isOwner}
   icon={RESET_ICON}
   label={localize('resetExpertise')}
   onclick={resetExpertise}
/>
