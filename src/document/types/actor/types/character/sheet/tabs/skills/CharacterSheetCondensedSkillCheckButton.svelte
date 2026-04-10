<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import { getContext } from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type AttributeCheckParameters The Parameters of the Check this component represents. */
   export let checkParameters = void 0;

   /**@type {object} Reference to the reactive Document store. */
   const document = getContext('document');

   /** @type {string} Calculated tooltip. */
   let tooltip = localize(`${checkParameters.skill}.desc`);
   tooltip += getAttributeCheckParametersTooltip(checkParameters);
</script>

<CondensedCheckButton
   attribute={checkParameters.attribute}
   label={localize(checkParameters.skill)}
   on:click={() => $document.system.requestAttributeCheck({skill: checkParameters.skill})}
   {tooltip}
   totalDice={checkParameters.totalDice}
/>
