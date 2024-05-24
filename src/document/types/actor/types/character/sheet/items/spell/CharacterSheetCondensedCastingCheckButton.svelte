<script>
   import {getContext} from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /** @type string The ID of the Item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type CastingCheckOptions Base options for the Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type CastingCheckParameters Calculated check parameters. */
   let checkParameters;

   /** @type string Calculated tooltip. */
   let tooltip;

   // Update the component in response to changes
   $: {
      // Ensure the item is valid
      if ($document.items.get(itemId)) {

         // Update the parameters
         checkParameters = $document.system.getCastingCheckParameters(
            $document.system.initializeCastingCheckOptions(checkOptions)
         );

         // Update the tooltip
         tooltip = getAttributeCheckParametersTooltip(checkParameters);
      }
   }
</script>
<CondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestCastingCheck(checkOptions)}
   {tooltip}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
