<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import recalculateCheckResults from '~/check/chat-message/RecalculateCheckResults';
   import { RESET_ICON } from '~/system/Icons.js';

   const document = getContext('document');

   /**
    *
    */
   async function resetExpertise() {
      // Remove the expertise from the dice
      $document.flags.titan.results.dice.forEach((dice) => {
         dice.final = dice.base;
         dice.expertiseApplied = 0;
      });

      // Recalculate the results
      $document.flags.titan.results.expertiseRemaining =
         $document.flags.titan.parameters.totalExpertise;
      const newResults = recalculateCheckResults($document.flags.titan);

      await $document.update({
         flags: {
            titan: {
               results: newResults,
            },
         },
      });
   }
</script>

<IconButton
   icon="{RESET_ICON}"
   on:click={() => {
      resetExpertise();
   }}
/>
