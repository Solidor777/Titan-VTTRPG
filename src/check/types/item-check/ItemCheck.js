import { clamp } from '~/helpers/Utility.js';
import TitanAttributeCheck from '~/check/types/attribute-check/AttributeCheck';
import calculateItemCheckResults from './CalculateItemCheckResults';

export default class TitanItemCheck extends TitanAttributeCheck {
   _ensureValidConstruction(options) {
      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error(
            'TITAN | Item Check failed during construction. No provided Actor Roll Data.'
         );
         return false;
      }

      // Check if the item is valid
      if (!options.itemRollData) {
         console.error(
            `TITAN | Item Check failed during construction. No provided Item Roll Data.`
         );
         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      const parameters = super._initializeParameters(options);

      // Cache data for later
      const actorRollData = options.actorRollData;
      const itemRollData = options.itemRollData;

      // Initialize base parameters
      parameters.img = itemRollData.img;
      parameters.itemName = itemRollData.name;
      parameters.resolveCost = options.resolveCost ?? false;
      parameters.isDamage = options.isDamage ?? false;
      parameters.isHealing = options.isHealing ?? false;
      parameters.resistanceCheck = options.resistanceCheck ?? false;

      // Get damage and healing specific parameters
      if (parameters.isDamage || parameters.isHealing) {
         parameters.initialValue = options.initialValue ?? 1;
         parameters.scaling = options.scaling ?? true;

         // Damage specific parameters
         if (parameters.isDamage) {
            parameters.damageMod = options.damageMod ?? actorRollData.mod.damage.value;
         }

         // Healing specific parameters
         if (parameters.isHealing) {
            parameters.healingMod = options.healingMod ?? actorRollData.mod.healing.value;
         }
      }

      // Opposed check parameters
      const opposedCheck = options.opposedCheck;
      if (opposedCheck) {
         parameters.opposedCheck = {
            attribute: opposedCheck.attribute ?? 'body',
            skill: opposedCheck.skill ?? false,
            difficulty: opposedCheck.difficulty ? clamp(opposedCheck.difficulty, 2, 6) : 4,
            complexity: opposedCheck.complexity ? Math.max(0, opposedCheck.complexity) : 0,
         };
      }

      return parameters;
   }

   _calculateResults(inResults, parameters) {
      return calculateItemCheckResults(inResults, parameters);
   }

   _getCheckType() {
      return 'itemCheck';
   }
}