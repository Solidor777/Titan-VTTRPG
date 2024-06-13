<script>
   import CondensedCheckButton from '~/helpers/svelte-components/button/CondensedCheckButton.svelte';
   import {getContext} from 'svelte';
   import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
   import localize from '~/helpers/utility-functions/Localize.js';

   /** @type AttributeCheckParameters The Parameters of the Attribute check using this skill. */
   export let checkParameters = void 0;

   /** @type object Reference to the Document store. */
   const document = getContext('document');

   /** @type string Calculated tooltipAction. */
   let tooltip = localize(`${checkParameters.skill}.desc`);
   tooltip += getAttributeCheckParametersTooltip(checkParameters);
</script>

<CondensedCheckButton
   attribute={checkParameters.attribute}
   label={localize(checkParameters.skill)}
   on:click={() => $document.system.requestAttributeCheck({skill: checkParameters.skill})}
   resolveCost={checkParameters.resolveCost}
   {tooltip}
   totalDice={checkParameters.totalDice}
/>
