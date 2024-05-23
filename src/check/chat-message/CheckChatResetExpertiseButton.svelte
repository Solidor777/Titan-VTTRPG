<script>
   import {getContext} from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
   import {RESET_ICON} from '~/system/Icons.js';

   /** @type ChatMessage Reference to the Chat Message document. */
   const document = getContext('document');

   /**
    * Resets all applied Expertise.
    */
   function resetExpertise() {
      // Remove the expertise from each dice.
      for (const die of $document.flags.titan.results.dice) {
         die.final = die.base;
         die.expertiseApplied = 0;
      }
      ;

      // Reset the expertise available and recalculate the check results
      $document.flags.titan.results.expertiseRemaining = $document.flags.titan.parameters.totalExpertise;
      const newResults = recalculateCheckResults($document.flags.titan);

      $document.update({
         flags: {
            titan: {
               results: newResults,
            },
         },
      });
   }
</script>

<IconButton
   disabled={!$document.isOwner}
   icon="{RESET_ICON}"
   on:click={resetExpertise}
/>
