<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /**
    * @typedef {object} CharacterSheetCondensedCastingCheckButtonProps
    * @property {string} [itemId] The ID of the Item to get the check from.
    */

   /** @type {CharacterSheetCondensedCastingCheckButtonProps} */
   const { itemId = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   // itemId is fixed per mounted instance; capturing once in checkOptions is intentional.
   // svelte-ignore state_referenced_locally
   /** @type {CastingCheckOptions} Base options for the Check. */
   const checkOptions = {
      itemId: itemId,
   };

   /** @type {CastingCheckParameters} Resolved dice and modifiers for the casting check this button rolls. */
   let checkParameters = $derived.by(() => {

      // Ensure the item is valid.
      if (document.data.items.get(itemId)) {

         // Update the parameters.
         return document.data.system.getCastingCheckParameters(
            document.data.system.initializeCastingCheckOptions(checkOptions)
         );
      }
      return undefined;
   });

   /** @type {string} Calculated tooltipAction. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined
   );
</script>
<CondensedCheckButton
   attribute={checkParameters.attribute}
   complexity={checkParameters.complexity}
   difficulty={checkParameters.difficulty}
   onclick={() => document.data.system.requestCastingCheck(checkOptions)}
   tooltip={{ text: tooltip, localize: false }}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
