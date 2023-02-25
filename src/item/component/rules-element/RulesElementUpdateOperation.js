import { getFlatModifierTemplate } from '~/rules-element/FlatModifier.js';
import { getMulBaseTemplate } from '~/rules-element/MulBase.js';
import { getFastHealingTemplate } from '~/rules-element/FastHealing.js';
import { getPersistentDamageTemplate } from '~/rules-element/PersistentDamage';
import { getTurnMessageTemplate } from '~/rules-element/TurnMessage';

export default async function onRulesElementOperationChanged(document, elementIdx) {
   const element = document.system.rulesElement[elementIdx];
   switch (element.operation) {
      case 'flatModifier': {
         document.system.rulesElement[elementIdx] = getFlatModifierTemplate(element.uuid, element.type);
         break;
      }
      case 'mulBase': {
         document.system.rulesElement[elementIdx] = getMulBaseTemplate(element.uuid, element.type);
         break;
      }
      case 'turnMessage': {
         document.system.rulesElement[elementIdx] = getTurnMessageTemplate(element.uuid, element.type);
         break;
      }
      case 'fastHealing': {
         document.system.rulesElement[elementIdx] = getFastHealingTemplate(element.uuid, element.type);
         break;
      }
      case 'persistentDamage': {
         document.system.rulesElement[elementIdx] = getPersistentDamageTemplate(element.uuid, element.type);
         break;
      }
      default: {
         console.error(`TITAN: Invalid Rules Element operation ${element.operation}`);
         console.trace();
         return;
      }
   }

   return await document.update({
      system: {
         rulesElement: document.system.rulesElement
      }
   });
}