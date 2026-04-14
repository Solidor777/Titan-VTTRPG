import {
   DICE_ICON,
   EXPERTISE_ICON,
   MOD_ICON,
   REFLEXES_ICON,
   RESILIENCE_ICON,
   WILLPOWER_ICON,
} from '~/system/Icons.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Creates a tooltip based on the provided parameters of a Resistance check.
 * @param {ResistanceCheckParameters} checkParameters - The check parameters
 *    used to create the check tooltip.
 * @returns {string} A tooltip based on the provided check parameters.
 */
export default function getResistanceCheckParametersTooltip(checkParameters) {
   /** @type {string} */
   let retVal = '';

   // Add Resistance dice.
   if (checkParameters.resistanceDice) {

      // Add the icon appropriate to the attribute
      let resistanceIcon;
      switch (checkParameters.resistance) {
         case 'reflexes': {
            resistanceIcon = REFLEXES_ICON;
            break;
         }
         case 'resilience': {
            resistanceIcon = RESILIENCE_ICON;
            break;
         }
         default: {
            resistanceIcon = WILLPOWER_ICON;
            break;
         }
      }

      retVal +=
         `<p><i style="width:20px;text-align:center" class="${resistanceIcon}"></i> ${localize(checkParameters.resistance)}: ${checkParameters.resistanceDice}</p>`;
   }

   // Add Dice Mod data.
   if (checkParameters.diceMod) {
      retVal +=
         `<p><i style="width:20px;text-align:center" class="${MOD_ICON}"></i> ${localize('diceMod')}: ${checkParameters.diceMod}</p>`;
   }

   // Add Total Dice data.
   retVal += `<p><i style="width:20px;text-align:center" class="${DICE_ICON}"></i> ${localize('totalDice')}: ${checkParameters.totalDice}</p>`;

   // Add Expertise data.
   if (checkParameters.totalExpertise) {
      retVal += `<p><i style="width:20px;text-align:center" class="${EXPERTISE_ICON}"></i> ${localize('expertise')}: ${checkParameters.totalExpertise}</p>`;
   }

   return retVal;
}
