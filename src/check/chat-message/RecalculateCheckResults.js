import calculateCheckResults from '~/check/CheckResults.js';
import calculateAttackCheckResults from '~/check/types/attack-check/AttackCheckResults.js';
import calculateCastingCheckResults from '~/check/types/casting-check/CastingCheckResults.js';
import calculateItemCheckResults from '~/check/types/item-check/ItemCheckResults.js';
import calculateAttributeCheckResults from '~/check/types/attribute-check/AttributeCheckResults.js';
import calculateResistanceCheckResults from '~/check/types/resistance-check/ResistanceCheckResults.js';

export default function recalculateCheckResults(check) {
   // Initialize results
   const checkDice = {
      dice: check.results.dice,
      expertiseRemaining: check.results.expertiseRemaining,
   };

   // Switch depending on check type
   switch (check.type) {
      case 'attributeCheck': {
         return calculateAttributeCheckResults(checkDice, check.parameters);
      }
      case 'resistanceCheck': {
         return calculateResistanceCheckResults(checkDice, check.parameters);
      }
      case 'attackCheck': {
         return calculateAttackCheckResults(checkDice, check.parameters);
      }
      case 'castingCheck': {
         return calculateCastingCheckResults(checkDice, check.parameters);
      }
      case 'itemCheck': {
         return calculateItemCheckResults(checkDice, check.parameters);
      }
      default: {
         return calculateCheckResults(checkDice, check.parameters);
      }
   }
}
