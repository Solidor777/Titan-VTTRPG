import TitanAttributeCheck from '~/check/types/attribute-check/AttributeCheck';
import calculateItemCheckResults from './CalculateItemCheckResults';

export default class TitanItemCheck extends TitanAttributeCheck {
   _initializeParameters(options) {
      const parameters = super._initializeParameters(options);

      // Initialize base parameters
      parameters.img = options.img;
      parameters.itemName = options.itemName;
      parameters.resolveCost = options.resolveCost ?? false;
      parameters.isDamage = options.isDamage ?? false;
      parameters.isHealing = options.isHealing ?? false;
      parameters.resistanceCheck = options.resistanceCheck ?? false;

      // Get damage and healing specific parameters
      if (parameters.isDamage || parameters.isHealing) {
         const actorRollData = options.actorRollData;
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
      if (options.opposedCheck) {
         parameters.opposedCheck = {
            attribute: options.opposedCheck.attribute ?? 'body',
            skill: options.opposedCheck.skill ?? false,
            difficulty: options.opposedCheck.difficulty ?? 4,
            complexity: options.opposedCheck.complexity ?? 1
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