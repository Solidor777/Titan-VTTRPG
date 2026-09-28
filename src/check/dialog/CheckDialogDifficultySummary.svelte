<script>
   import { getContext } from 'svelte';
   import CheckDialogSummary from '~/check/dialog/CheckDialogSummary.svelte';

   /** @type {import('svelte/store').Writable} Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');
</script>

<CheckDialogSummary
   label={'effectiveDifficulty'}
   testId={'check-summary-difficulty'}
   tooltip={'check.effectiveDifficulty.desc'}
   value={$checkParameters.difficulty}
/>
