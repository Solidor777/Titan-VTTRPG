<script>
   import { getContext } from 'svelte';
   import { ACCURACY_ICON, MELEE_ICON } from '~/system/Icons.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';

   /**
    * @typedef {object} CharacterSheetCondensedAttackCheckButtonProps
    * @property {string} [itemId] The ID of the Item to get the check from.
    */

   /** @type {CharacterSheetCondensedAttackCheckButtonProps} */
   const { itemId = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {AttackCheckOptions} Base options for the Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type {AttackCheckParameters} Calculated check parameters. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      const item = $document.items.get(itemId);
      if (item?.system.attack.length > 0) {

         // Update the parameters.
         return $document.system.getAttackCheckParameters(
            $document.system.initializeAttackCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /** @type {string} Calculated check icon. */
   let icon = $derived(
      checkParameters?.type === 'melee' ? MELEE_ICON : ACCURACY_ICON
   );

   /** @type {string} Calculated tooltipAction. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined
   );
</script>
<CondensedCheckButton
   attribute={checkParameters.attribute}
   checkIcon={icon}
   onclick={() => $document.system.requestAttackCheck(checkOptions)}
   {tooltip}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
