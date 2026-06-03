<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults.js';
   import { RESET_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Resets all applied Expertise.
    */
   function resetExpertise() {
      // Remove the expertise from each die.
      for (const die of document.data.system.results.dice) {
         die.final = die.base;
         die.expertiseApplied = 0;
      }

      // Reset the expertise available and recalculate the check results.
      document.data.system.results.expertiseRemaining = document.data.system.parameters.totalExpertise;
      const newResults = recalculateCheckResults(
         {
            type: document.data.type,
            parameters: document.data.system.parameters,
            results: document.data.system.results,
         },
      );

      document.data.update({
         system: {
            results: structuredClone(newResults),
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
