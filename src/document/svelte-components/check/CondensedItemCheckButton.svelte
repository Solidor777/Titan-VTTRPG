<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getItemCheckParametersTooltip from '~/helpers/utility-functions/GetItemCheckParametersTooltip.js';

   /**
    * @typedef {object} CondensedItemCheckButtonProps
    * @property {number} [idx] - Index of the item check this button rolls.
    */

   /** @type {CondensedItemCheckButtonProps} */
   const { idx = 0 } = $props();

   /** @type {object} The item bridge: the embedded item on the actor sheet, the sheet's item on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this check (actor sheet's actor, or the item's parent actor). */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {ItemCheckOptions} Base options for the Item Check, targeting this row's check index. */
   const checkOptions = {
      itemId: document.doc._id,
      checkIdx: idx,
   };

   /** @type {ItemCheckParameters|undefined} Resolved dice and modifiers for the item check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data?.system.check.length > 0) {
         return rollActor.data.system.getItemCheckParameters(
            rollActor.data.system.initializeItemCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getItemCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      complexity={checkParameters.complexity}
      difficulty={checkParameters.difficulty}
      onclick={() => rollActor.data.system.requestItemCheck(checkOptions)}
      resolveCost={checkParameters.resolveCost}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
