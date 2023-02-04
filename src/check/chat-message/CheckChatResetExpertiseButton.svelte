<script>
   import { getContext } from 'svelte';
   import IconButton from '~/helpers/svelte-components/button/IconButton.svelte';
   import recalculateCheckResults from './RecalculateCheckResults';

   const document = getContext('DocumentStore');
   async function resetExpertise() {
      // Remove the expertise from the dice
      $document.flags.titan.chatContext.results.dice.forEach((dice) => {
         dice.final = dice.base;
         dice.expertiseApplied = 0;
      });

      // Recalculate the results
      $document.flags.titan.chatContext.results.expertiseRemaining =
         $document.flags.titan.chatContext.parameters.totalExpertise;
      const newResults = recalculateCheckResults(
         $document.flags.titan.chatContext
      );

      await $document.update({
         flags: {
            titan: {
               chatContext: {
                  results: newResults,
               },
            },
         },
      });
   }
</script>

<IconButton
   icon="fas fa-arrow-rotate-left"
   on:click={() => {
      resetExpertise();
   }}
/>
