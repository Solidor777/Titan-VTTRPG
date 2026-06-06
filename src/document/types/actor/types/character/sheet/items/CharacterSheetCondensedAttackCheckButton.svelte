<script>
   import { getContext } from 'svelte';
   import { ACCURACY_ICON, MELEE_ICON } from '~/system/Icons.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {AttackCheckOptions} Base options for the Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {AttackCheckParameters} Resolved dice and modifiers for the attack check this button rolls. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.attack.length > 0) {

         // Update the parameters.
         return sheetDocument.data.system.getAttackCheckParameters(
            sheetDocument.data.system.initializeAttackCheckOptions(checkOptions)
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
   onclick={() => sheetDocument.data.system.requestAttackCheck(checkOptions)}
   tooltip={{ text: tooltip, localize: false }}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
