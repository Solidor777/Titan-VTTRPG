<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /**
    * @typedef {object} CharacterSheetCondensedSkillCheckButtonProps
    * @property {AttributeCheckParameters} [checkParameters] The Parameters of the Check this component represents.
    */

   /** @type {CharacterSheetCondensedSkillCheckButtonProps} */
   const { checkParameters = undefined } = $props();

   /** @type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Calculated tooltip. */
   let tooltip = $derived(
      localize(`${checkParameters.skill}.desc`) +
      getAttributeCheckParametersTooltip(checkParameters)
   );
</script>

<CondensedCheckButton
   attribute={checkParameters.attribute}
   label={localize(checkParameters.skill)}
   onclick={() => $document.system.requestAttributeCheck({skill: checkParameters.skill})}
   {tooltip}
   totalDice={checkParameters.totalDice}
/>
