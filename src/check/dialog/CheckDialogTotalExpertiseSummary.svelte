<script>

   import { getContext } from 'svelte';
   import CheckDialogSummary from '~/check/dialog/CheckDialogSummary.svelte';

   /** @type {object} Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');

</script>

<CheckDialogSummary
   label={'totalExpertise'}
   testId={'check-summary-totalExpertise'}
   tooltip={'check.totalExpertise.desc'}
   value={$checkParameters.totalExpertise}
/>
