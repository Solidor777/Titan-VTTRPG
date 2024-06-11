import localize from '~/helpers/utility-functions/Localize.js';
import getAttributeCheckParametersTooltip from '~/helpers/utility-functions/GetAttributeCheckParametersTooltip.js';
import {RESOLVE_ICON} from '~/system/Icons.js';

/**
 * Creates a tooltipAction based on the provided parameters of an Item check.
 * @param {ItemCheckParameters} checkParameters - The check parameters used to create the check tooltipAction.
 * @returns {string} A tooltipAction based on the provided check parameters.
 */
export default function getItemCheckParametersTooltip(checkParameters) {
   let retVal = getAttributeCheckParametersTooltip(checkParameters);

   // Add resolve cost
   if (checkParameters.resolveCost) {
      retVal +=
         `<p><i style="width:20px;text-align:center" class="${RESOLVE_ICON}"></i> ${localize('resolveCost')}: ${checkParameters.resolveCost}</p>`;
   }

   return retVal;
}