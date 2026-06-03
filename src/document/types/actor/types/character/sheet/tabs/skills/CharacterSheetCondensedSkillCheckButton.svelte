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

   /** @type {string} Hover text describing the skill and its check modifiers. */
   let tooltip = $derived(
      localize(`${checkParameters.skill}.desc`) +
      getAttributeCheckParametersTooltip(checkParameters)
   );
</script>

<CondensedCheckButton
   attribute={checkParameters.attribute}
   label={localize(checkParameters.skill)}
   onclick={() => document.data.system.requestAttributeCheck({skill: checkParameters.skill})}
   tooltip={{ text: tooltip, localize: false }}
   totalDice={checkParameters.totalDice}
/>
