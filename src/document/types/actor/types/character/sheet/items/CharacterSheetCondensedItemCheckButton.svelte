<script>
   import CharacterSheetCondensedCheckButton
      from '~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte';
   import {getContext} from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /** @type string The ID of the Item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type ItemCheckOptions Base options for the Item Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type ItemCheckParameters Calculated check parameters. */
   let checkParameters;

   /** @type string Calculated tooltip. */
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

         // Update the tooltip
         tooltip = getItemCheckParametersTooltip(checkParameters);
      }
   }
</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestItemCheck(checkOptions)}
   resolveCost="{checkParameters.resolveCost}"
   {tooltip}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
