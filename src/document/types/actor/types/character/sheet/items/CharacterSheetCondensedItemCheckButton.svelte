<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /** @type {object} The embedded item bridge provided by EmbeddedDocumentProvider. */
   const document = getContext('document');

   /** @type {object} The owning sheet's actor bridge (never shadowed by providers). */
   const sheetDocument = getContext('sheetDocument');

   // The item id is fixed for this component's lifetime (provider instances are id-keyed); capturing
   // once in checkOptions is intentional.
   /** @type {ItemCheckOptions} Base options for the Item Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {ItemCheckParameters} Resolved dice and modifiers for the item check this button rolls. */
   let checkParameters = $derived.by(() => {

      // Ensure the item and check are valid.
      if (document.data?.system.check.length > 0) {

         // Update the parameters.
         return sheetDocument.data.system.getItemCheckParameters(
            sheetDocument.data.system.initializeItemCheckOptions(checkOptions)
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
   onclick={() => sheetDocument.data.system.requestItemCheck(checkOptions)}
   resolveCost={checkParameters.resolveCost}
   tooltip={{ text: tooltip, localize: false }}
   totalDice={checkParameters.totalDice}
   totalExpertise={checkParameters.totalExpertise}
/>
