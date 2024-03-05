import TitanCheck from '~/check/Check.js';
import calculateAttributeCheckResults from '~/check/types/attribute-check/CalculateAttributeCheckResults';

export default class TitanAttributeCheck extends TitanCheck {
   _ensureValidConstruction(options) {
      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error('TITAN | Attribute Check failed during construction. No provided Actor Roll Data.');
         console.trace();

         return false;
      }

      // Ensure a valid attribute / skill combination
      if ((!options.skill || options.skill === 'none') && (!options.attribute || options.attribute === 'default')) {
         console.error('TITAN | Attribute Check failed during construction. Neither skill nor attribute were provided.');
         console.trace();

         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      const parameters = super._initializeParameters(options);
      const actorRollData = options.actorRollData;

      // Initialize base parameters
      parameters.trainingMod = options.trainingMod ?? 0;
      parameters.doubleTraining = options.doubleTraining ?? false;

      // Damage to resist
      if (options.damageToResist && options.damageToResist > 0) {
         parameters.damageToResist = options.damageToResist;
      }

      // Determine the skill training and expertise
      if (options.skill && options.skill !== 'none') {
         parameters.skill = options.skill;
         const skillData = actorRollData.skill[parameters.skill];
         parameters.skillTrainingDice = skillData.training.value;
         parameters.skillExpertise = skillData.expertise.value;

         // Calculate the total training dice
         let totalTrainingDice = parameters.skillTrainingDice + parameters.trainingMod;
         if (parameters.doubleTraining) {
            totalTrainingDice *= 2;
         }
         parameters.totalTrainingDice = totalTrainingDice;
         parameters.totalDice += totalTrainingDice;

         // Calculcate the total expertise
         let totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
         if (parameters.doubleExpertise) {
            totalExpertise *= 2;
         }
         parameters.totalExpertise = totalExpertise;

      }

      // Determine the attribute die
      parameters.attribute = options.attribute;
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;
      parameters.totalDice += parameters.attributeDice;

      // Initialize damage to reduce
      parameters.damageToReduce = options.damageToReduce ?? 0;

      return parameters;
   }

   _calculateResults(inResults, parameters) {
      return calculateAttributeCheckResults(inResults, parameters);
   }

   _getCheckType() {
      return 'attributeCheck';
   }
}