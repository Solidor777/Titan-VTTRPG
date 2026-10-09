<script>
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';

   /** @type {object} The item bridge: the embedded spell on the actor sheet, the sheet's spell on the item sheet. */
   const document = getContext('document');

   /** @type {import('~/document/reactive/ResolveRollActor.js').RollActorReference} The sheet's roll actor reference. */
   const rollActorReference = getContext('rollActor');

   /** @type {object|undefined} The actor that rolls this casting check. */
   const rollActor = $derived(rollActorReference.current);

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {CastingCheckOptions} Base options for the Casting Check. */
   const checkOptions = {
      itemId: document.doc._id,
   };

   /** @type {CastingCheckParameters|undefined} Resolved dice and modifiers for the casting check this button rolls. */
   let checkParameters = $derived.by(() => {
      // The roll actor validates the options first, so a deleted owned item is never read.
      if (rollActor && document.data &&
         rollActor.data.system.validateCastingCheckOptions(checkOptions, false)) {
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
      tooltip={{
         text: tooltip,
         localize: false,
      }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
