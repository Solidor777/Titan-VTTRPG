import calculateCheckResults from '~/check/CheckResults.js';
import calculateAttackCheckResults from '~/check/types/attack-check/AttackCheckResults.js';
import calculateCastingCheckResults from '~/check/types/casting-check/CastingCheckResults.js';
import calculateItemCheckResults from '~/check/types/item-check/ItemCheckResults.js';
import calculateAttributeCheckResults from '~/check/types/attribute-check/AttributeCheckResults.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/ResistanceCheckResults.js';

/**
 * Takes a completed Check Chat Message and returns the new results in response to changes in the dice or parameters.
 * @param {object} checkChatMessage - The Check Chat Message to recalculate the results for.
 * @returns {CheckResults} The new results in response to changes in the dice or parameters.
 */
export default function recalculateCheckResults(checkChatMessage) {
   // Initialize results
   const checkDice = {
      dice: checkChatMessage.results.dice,
      expertiseRemaining: checkChatMessage.results.expertiseRemaining,
   };

   // Switch depending on check type
   switch (checkChatMessage.type) {
      case 'attributeCheck': {
         return calculateAttributeCheckResults(checkDice, checkChatMessage.parameters);
      }
      case 'resistanceCheck': {
         return calculateResistanceCheckResults(checkDice, checkChatMessage.parameters);
      }
      case 'attackCheck': {
         return calculateAttackCheckResults(checkDice, checkChatMessage.parameters);
      }
      case 'castingCheck': {
         return calculateCastingCheckResults(checkDice, checkChatMessage.parameters);
      }
      case 'itemCheck': {
         return calculateItemCheckResults(checkDice, checkChatMessage.parameters);
      }
      default: {
         return calculateCheckResults(checkDice, checkChatMessage.parameters);
      }
   }
}
