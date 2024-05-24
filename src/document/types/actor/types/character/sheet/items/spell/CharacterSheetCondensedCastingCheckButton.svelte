<script>
   import {getContext} from 'svelte';
   import getCheckParametersTooltip from '~/helpers/utility-functions/GetCheckParametersTooltip.js';
   import CharacterSheetCondensedCheckButton
      from '~/document/types/actor/types/character/sheet/CharacterSheetCondensedCheckButton.svelte';

   /** @type string The ID of the Item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type CastingCheckOptions Base options for the Casting Check. */
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
         tooltip = getCheckParametersTooltip(checkParameters);
      }
   }
</script>
<CharacterSheetCondensedCheckButton
   attribute="{checkParameters.attribute}"
   complexity="{checkParameters.complexity}"
   difficulty="{checkParameters.difficulty}"
   on:click={() => $document.system.requestCastingCheck(checkOptions)}
   {tooltip}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
