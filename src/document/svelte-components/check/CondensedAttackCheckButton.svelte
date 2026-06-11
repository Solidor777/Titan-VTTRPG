<script>
   import { getContext } from 'svelte';
   import { ACCURACY_ICON, MELEE_ICON } from '~/system/Icons.js';
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';

   /**
    * @typedef {object} CondensedAttackCheckButtonProps
    * @property {number} [idx] - Index of the attack this button rolls.
    */

   /** @type {CondensedAttackCheckButtonProps} */
   const { idx = 0 } = $props();

   /** @type {object} The item bridge: the embedded weapon on the actor sheet, the sheet's weapon on the item sheet. */
   const document = getContext('document');

   /** @type {object|undefined} The actor that rolls this attack. */
   const rollActor = getContext('rollActor');

   // The item id is fixed for this component's lifetime; capturing it once in checkOptions is intentional.
   /** @type {AttackCheckOptions} Base options for the Attack Check, targeting this row's attack index. */
   const checkOptions = {
      itemId: document.doc._id,
      attackIdx: idx,
   };

   /** @type {AttackCheckParameters|undefined} Resolved dice and modifiers for the attack check this button rolls. */
   let checkParameters = $derived.by(() => {
      if (rollActor && document.data?.system.attack.length > 0) {
         return rollActor.data.system.getAttackCheckParameters(
            rollActor.data.system.initializeAttackCheckOptions(checkOptions),
         );
      }
      return undefined;
   });

   /** @type {string} Calculated check icon. */
   let icon = $derived(
      checkParameters?.type === 'melee' ? MELEE_ICON : ACCURACY_ICON,
   );

   /** @type {string|undefined} Calculated tooltip. */
   let tooltip = $derived(
      checkParameters ? getAttributeCheckParametersTooltip(checkParameters) : undefined,
   );
</script>

{#if checkParameters}
   <CondensedCheckButton
      attribute={checkParameters.attribute}
      checkIcon={icon}
      onclick={() => rollActor.data.system.requestAttackCheck(checkOptions)}
      tooltip={{ text: tooltip, localize: false }}
      totalDice={checkParameters.totalDice}
      totalExpertise={checkParameters.totalExpertise}
   />
{/if}
