<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters} Resolved dice and modifiers for the casting check this button rolls. */
   let checkParameters = $derived.by(() => {

      // Ensure the item is valid.
      if (document.data) {

         // Update the parameters.
         return sheetDocument.data.system.getCastingCheckParameters(
            sheetDocument.data.system.initializeCastingCheckOptions(checkOptions)
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
   onclick={() => sheetDocument.data.system.requestCastingCheck(checkOptions)}
   tooltip={{ text: tooltip, localize: false }}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
