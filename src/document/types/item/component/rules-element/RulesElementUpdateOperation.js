import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage';
import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage';
import createRollMessageElement from '~/document/types/item/rules-element/RollMessage';
import createConditionalRatingModifierElement from '~/document/types/item/rules-element/ConditionalRatingModifier';
import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier';

export default async function onRulesElementOperationChanged(document, elementIdx) {
   const element = document.system.rulesElement[elementIdx];
   switch (element.operation) {
      case 'flatModifier': {
         document.system.rulesElement[elementIdx] = createFlatModifierElement(element.uuid);
         break;
      }
      case 'mulBase': {
         document.system.rulesElement[elementIdx] = createMulBaseElement(element.uuid);
         break;
      }
      case 'fastHealing': {
         document.system.rulesElement[elementIdx] = createFastHealingElement(element.uuid);
         break;
      }
      case 'persistentDamage': {
         document.system.rulesElement[elementIdx] = createPersistentDamageElement(element.uuid);
         break;
      }
      case 'turnMessage': {
         document.system.rulesElement[elementIdx] = createTurnMessageElement(element.uuid);
         break;
      }
      case 'rollMessage': {
         document.system.rulesElement[elementIdx] = createRollMessageElement(element.uuid);
         break;
      }
      case 'conditionalRatingModifier': {
         document.system.rulesElement[elementIdx] = createConditionalRatingModifierElement(element.uuid);
         break;
      }
      case 'conditionalCheckModifier': {
         document.system.rulesElement[elementIdx] = createConditionalCheckModifierElement(element.uuid);
         break;
      }
      default: {
         game.titan.error(`Invalid Rules Element operation ${element.operation}`);
         return;
      }
   }

   return await document.update({
      system: {
         rulesElement: document.system.rulesElement,
      },
   });
}
