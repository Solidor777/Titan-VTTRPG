<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /**
    * @typedef {object} CharacterSheetCondensedItemCheckButtonProps
    * @property {string} [itemId] The ID of the Item to get the check from.
    */

   /** @type {CharacterSheetCondensedItemCheckButtonProps} */
   const { itemId = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // itemId is fixed per mounted instance (keyed list items do not change their ID); capturing
   // once in checkOptions is intentional.
   // svelte-ignore state_referenced_locally
   /** @type {ItemCheckOptions} Base options for the Item Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type {ItemCheckParameters} Calculated check parameters. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      const item = document.data.items.get(itemId);
      if (item?.system.check.length > 0) {

         // Update the parameters.
         return document.data.system.getItemCheckParameters(
            document.data.system.initializeItemCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /** @type {string} Calculated tooltipAction. */
   let tooltip = $derived(
      checkParameters ? getItemCheckParametersTooltip(checkParameters) : undefined
   );
</script>
<CondensedCheckButton
   attribute={checkParameters.attribute}
   complexity={checkParameters.complexity}
   difficulty={checkParameters.difficulty}
   onclick={() => document.data.system.requestItemCheck(checkOptions)}
   resolveCost={checkParameters.resolveCost}
   {tooltip}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
