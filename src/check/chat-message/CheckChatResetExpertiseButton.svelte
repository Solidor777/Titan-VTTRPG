<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults.js';
   import { RESET_ICON } from '~/system/Icons.js';

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /**
    * Resets all applied Expertise.
    */
   function resetExpertise() {
      // Remove the expertise from each die.
      for (const die of document.data.flags.titan.results.dice) {
         die.final = die.base;
         die.expertiseApplied = 0;
      }

      // Reset the expertise available and recalculate the check results.
      document.data.flags.titan.results.expertiseRemaining = document.data.flags.titan.parameters.totalExpertise;
      const newResults = recalculateCheckResults(document.data.flags.titan);

      document.data.update({
         flags: {
            titan: {
               results: structuredClone(newResults),
            },
         },
      });
   }
</script>

<IconButton
   disabled={!document.data.isOwner}
   icon={RESET_ICON}
   onclick={resetExpertise}
/>
