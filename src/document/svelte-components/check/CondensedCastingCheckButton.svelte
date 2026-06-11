<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /** @type {object} The item bridge: the embedded spell on the actor sheet, the sheet's spell on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this casting check. */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters|undefined} Resolved dice and modifiers for the casting check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data) {
         return rollActor.data.system.getCastingCheckParameters(
            rollActor.data.system.initializeCastingCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      complexity={checkParameters.complexity}
      difficulty={checkParameters.difficulty}
      onclick={() => rollActor.data.system.requestCastingCheck(checkOptions)}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
