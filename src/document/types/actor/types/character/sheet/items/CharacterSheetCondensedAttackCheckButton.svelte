<script>
   import {getContext} from 'svelte';
   import {ACCURACY_ICON, MELEE_ICON} from '~/system/Icons.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';

   /** @type string The ID of the Item to get the check from. */
   export let itemId = void 0;

   /** @type TitanActor Reference to the Character Document. */
   const document = getContext('document');

   /** @type AttackCheckOptions Base options for the Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type AttackCheckParameters Calculated check parameters. */
   let checkParameters;

   /** @type string Calculated check icon. */
   let icon;

   /** @type string Calculated tooltip. */
   let tooltip;

   // Update parameters in response to changes
   $: {

      // Ensure the item and check are valid
      const item = $document.items.get(itemId);
      if (item?.system.attack.length > 0) {

         // Update the parameters
         checkParameters = $document.system.getAttackCheckParameters(
            $document.system.initializeAttackCheckOptions(checkOptions)
         );

         // Update the icon
         icon = checkParameters.type === 'melee' ? MELEE_ICON : ACCURACY_ICON;

         // Update the tooltip
         tooltip = getAttributeCheckParametersTooltip(checkParameters);
      }
   }
</script>
<CondensedCheckButton
   attribute="{checkParameters.attribute}"
   checkIcon="{icon}"
   on:click={() => $document.system.requestAttackCheck(checkOptions)}
   {tooltip}
   totalDice="{checkParameters.totalDice}"
   totalExpertise="{checkParameters.totalExpertise}"
/>
