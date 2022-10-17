import { getFlatModifierTemplate } from '~/rules-element/FlatModifier.js';
import { getDoubleBaseTemplate } from '~/rules-element/DoubleBase.js';
import getStartOfTurnMessageTemplate from '~/rules-element/StartOfTurnMessage.js';
import getModStaminaTemplate from '~/rules-element/StartOfTurnModStam.js';

export default async function onRulesElementOperationChanged(document, elementIdx) {
   switch (document.system.rulesElement[elementIdx].operation) {
      case 'flatModifier': {
         document.system.rulesElement[elementIdx] = getFlatModifierTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'doubleBase': {
         document.system.rulesElement[elementIdx] = getDoubleBaseTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'startOfTurnMessage': {
         document.system.rulesElement[elementIdx] = getStartOfTurnMessageTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'startOfTurnModStam': {
         document.system.rulesElement[elementIdx] = getModStaminaTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      default: {
         return;
      }
   }

   document.system.rulesElement[elementIdx].type = document.type;
   return await document.update({
      system: {
         rulesElement: document.system.rulesElement
      }
   });
}