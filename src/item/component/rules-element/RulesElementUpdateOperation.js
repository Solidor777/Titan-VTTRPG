import { getFlatModifierTemplate } from '~/rules-element/FlatModifier.js';
import { getMulBaseTemplate } from '~/rules-element/MulBase.js';
import { getFastHealingTemplate } from '~/rules-element/FastHealing.js';
import getTurnStartMessageTemplate from '~/rules-element/TurnStartMessage.js';

export default async function onRulesElementOperationChanged(document, elementIdx) {
   switch (document.system.rulesElement[elementIdx].operation) {
      case 'flatModifier': {
         document.system.rulesElement[elementIdx] = getFlatModifierTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'mulBase': {
         document.system.rulesElement[elementIdx] = getMulBaseTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'turnStartMessage': {
         document.system.rulesElement[elementIdx] = getTurnStartMessageTemplate(document.system.rulesElement[elementIdx].uuid);
         break;
      }
      case 'fastHealing': {
         document.system.rulesElement[elementIdx] = getFastHealingTemplate(document.system.rulesElement[elementIdx].uuid);
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