<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import {getContext} from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /** @type string The ID of the Item to get the check from. */
   export let itemId = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type ItemCheckOptions Base options for the Item Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type ItemCheckParameters Calculated check parameters. */
   let checkParameters;

   /** @type string Calculated tooltipAction. */
   let tooltip;

   // Update parameters in response to changes
   $: {

      // Ensure the item and check are valid
      const item = $document.items.get(itemId);
      if (item?.system.check.length > 0) {

         // Update the parameters
         checkParameters = $document.system.getItemCheckParameters(
            $document.system.initializeItemCheckOptions(checkOptions)
         );

         // Update the tooltipAction
         tooltip = getItemCheckParametersTooltip(checkParameters);
      }
   }
</script>
<CondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestItemCheck(checkOptions)}
   resolveCost="{checkParameters.resolveCost}"
   {tooltip}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
