import localize from '~/helpers/utility-functions/Localize.js';
import getCheckParametersTooltip from '~/helpers/utility-functions/GetCheckParametersTooltip.js';
import {RESOLVE_ICON} from '~/system/Icons.js';

/**
 * Creates a tooltip based on the provided of Item check.
 * @param {ItemCheckParameters} checkParameters - The check parameters used to create the check tooltip.
 * @returns {string} A tooltip based on the provided check parameters.
 */
export default function getItemCheckParametersTooltip(checkParameters) {
   let retVal = getCheckParametersTooltip(checkParameters);

   // Add resolve cost
   if (checkParameters.resolveCost) {
      retVal +=
         `<p><i style="width:20px;text-align:center" class="${RESOLVE_ICON}"></i> ${localize('resolveCost')}: ${checkParameters.resolveCost}</p>`;
   }

   return retVal;
}