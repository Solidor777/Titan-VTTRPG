import createFlatModifierElement from '~/document/types/item/rules-element/FlatModifier.js';
import createMulBaseElement from '~/document/types/item/rules-element/MulBase.js';
import createFastHealingElement from '~/document/types/item/rules-element/FastHealing.js';
import createPersistentDamageElement from '~/document/types/item/rules-element/PersistentDamage';
import createTurnMessageElement from '~/document/types/item/rules-element/TurnMessage';
import createRollMessageElement from '~/document/types/item/rules-element/RollMessage';
import createConditionalRatingModifierElement from '~/document/types/item/rules-element/ConditionalRatingModifier';
import createConditionalCheckModifierElement from '~/document/types/item/rules-element/ConditionalCheckModifier';

/**
 * Used to update a Rules Element when its Operation type changes.
 * @param {TitanItem} item - The Item to update the Rules Element of.
 * @param {number} elementIdx - The idx of the Rules Element in the rules elements array.
 * @returns {Promise<void>} Returns after the item owning the Rules Element has been updated.
 */
export default async function onRulesElementOperationChanged(item, elementIdx) {
   const element = item.system.rulesElement[elementIdx];
   switch (element.operation) {
      case 'flatModifier': {
         item.system.rulesElement[elementIdx] = createFlatModifierElement(element);
         break;
      }
      case 'mulBase': {
         item.system.rulesElement[elementIdx] = createMulBaseElement(element);
         break;
      }
      case 'fastHealing': {
         item.system.rulesElement[elementIdx] = createFastHealingElement(element);
         break;
      }
      case 'persistentDamage': {
         item.system.rulesElement[elementIdx] = createPersistentDamageElement(element);
         break;
      }
      case 'turnMessage': {
         item.system.rulesElement[elementIdx] = createTurnMessageElement(element);
         break;
      }
      case 'rollMessage': {
         item.system.rulesElement[elementIdx] = createRollMessageElement(element);
         break;
      }
      case 'conditionalRatingModifier': {
         item.system.rulesElement[elementIdx] = createConditionalRatingModifierElement(element);
         break;
      }
      case 'conditionalCheckModifier': {
         item.system.rulesElement[elementIdx] = createConditionalCheckModifierElement(element);
         break;
      }
      default: {
         game.titan.error(`Invalid Rules Element operation ${element.operation}`);
         return;
      }
   }

   await item.update({
      system: {
         rulesElement: item.system.rulesElement,
      },
   });
}
