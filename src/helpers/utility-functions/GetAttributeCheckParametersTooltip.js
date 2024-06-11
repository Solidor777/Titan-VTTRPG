import {BODY_ICON, DICE_ICON, EXPERTISE_ICON, MIND_ICON, MOD_ICON, SOUL_ICON, TRAINING_ICON} from '~/system/Icons.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Creates a tooltipAction based on the provided parameters ofan Attribute based check.
 * @param {AttributeCheckParameters} checkParameters - The check parameters used to create the check tooltipAction.
 * @returns {string} A tooltipAction based on the provided check parameters.
 */
export default function getAttributeCheckParametersTooltip(checkParameters) {
   let retVal = '';

   // Add Attribute tooltipAction
   if (checkParameters.attributeDice) {

      // Add the icon appropriate to the attribute
      let attributeIcon;
      switch (checkParameters.attribute) {
         case 'body': {
            attributeIcon = BODY_ICON;
            break;
         }
         case 'mind': {
            attributeIcon = MIND_ICON;
            break;
         }
         default: {
            attributeIcon = SOUL_ICON;
            break;
         }
      }

      retVal +=
         `<p><i style="width:20px;text-align:center" class="${attributeIcon}"></i> ${localize(checkParameters.attribute)}: ${checkParameters.attributeDice}</p>`;
   }

   // Add Training tooltipAction
   if (checkParameters.totalTrainingDice) {
      retVal +=
         `<p><i style="width:20px;text-align:center" class="${TRAINING_ICON}"></i> ${localize('training')}: ${checkParameters.totalTrainingDice}</p>`;
   }

   // Add Dice Mod tooltipAction
   if (checkParameters.diceMod) {
      retVal +=
         `<p><i style="width:20px;text-align:center" class="${MOD_ICON}"></i> ${localize('diceMod')}: ${checkParameters.diceMod}</p>`;
   }

   // Add Total Dice tooltipAction
   retVal += `<p><i style="width:20px;text-align:center" class="${DICE_ICON}"></i> ${localize('totalDice')}: ${checkParameters.totalDice}</p>`;

   // Add Expertise tooltipAction
   if (checkParameters.totalExpertise) {
      retVal += `<p><i style="width:20px;text-align:center" class="${EXPERTISE_ICON}"></i> ${localize('expertise')}: ${checkParameters.totalExpertise}</p>`;
   }

   return retVal;
}