<script>

   import { getContext } from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CheckDialogSummary from '~/check/dialog/CheckDialogSummary.svelte';

   /** @type {CheckParameters}   Reference to the Check Parameters. */
   const checkParameters = getContext('checkParameters');

</script>

<CheckDialogSummary
   label="{localize('totalExpertise')}"
   fieldTooltip="{localize('check.totalExpertise.desc')}"
   value={$checkParameters.totalExpertise}
/>
