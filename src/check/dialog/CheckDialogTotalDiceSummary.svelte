<script>

   import {getContext} from 'svelte';
   import localize from '~/helpers/utility-functions/Localize.js';
   import CheckDialogSummary from '~/check/dialog/CheckDialogSummary.svelte';

   /** @type object Reference to the Check Parameters store. */
   const checkParameters = getContext('checkParameters');

</script>

<CheckDialogSummary
   fieldTooltip="{localize('check.totalDice.desc')}"
   label="{localize('totalDice')}"
   value={$checkParameters.totalDice
   }/>
