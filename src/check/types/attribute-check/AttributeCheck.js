import TitanCheck from '~/check/Check.js';

export default class TitanAttributeCheck extends TitanCheck {
   _ensureValidConstruction(options) {
      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error(
            'TITAN | Attribute Check failed during construction. No provided Actor Roll Data.'
         );
         return false;
      }

      // Ensure a valid attribute / skill combination
      if ((!options.skill || options.skill === 'none') && (!options.attribute || options.attribute === 'default')) {
         console.error(
            'TITAN | Attribute Check failed during construction. Neither skill nor attribute were provided.'
         );
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
         parameters.totalDice += totalTrainingDice;

         // Calculcate the total expertise
         let totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
         if (parameters.doubleExpertise) {
            totalExpertise *= 2;
         }
         parameters.totalExpertise = totalExpertise;

      }

      // Determine the attribute die
      if (options.attribute && options.attribute !== 'default') {
         parameters.attribute = options.attribute;
      }
      else {
         parameters.attribute = actorRollData.skill[parameters.skill].defaultAttribute;
      }
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;
      parameters.totalDice += parameters.attributeDice;
      console.log(parameters);


      return parameters;
   }

   _getCheckType() {
      return 'attributeCheck';
   }
}