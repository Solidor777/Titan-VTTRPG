import TitanCheck from '~/check/Check.js';
import calculateCastingCheckResults from './CalculateCastingCheckResults';

export default class TitanCastingCheck extends TitanCheck {
   _ensureValidConstruction(options) {
      if (!super._ensureValidConstruction(options)) {
         return false;
      }

      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error(
            'TITAN | Casting Check failed during construction. No provided Actor Roll Data.'
         );
         return false;
      }

      // Check if the spell is valid
      if (!options.itemRollData) {
         console.error(
            `TITAN | Casting Check failed during construction. No provided Item Roll Data.`
         );
         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      // Cache data for later
      const actorRollData = options.actorRollData;
      const itemRollData = options.itemRollData;

      const parameters = {
         difficulty: options.difficulty ?? itemRollData.castingCheck.difficulty,
         complexity: options.complexity ?? itemRollData.castingCheck.complexity,
         diceMod: options.diceMod ?? 0,
         trainingMod: options.trainingMod ?? 0,
         expertiseMod: options.expertiseMod ?? 0,
         doubleExpertise: options.doubleExpertise ?? false,
         maximizeSuccesses: options.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options.extraFailureOnCritical ?? false,
         itemName: itemRollData.name,
         aspect: itemRollData.aspect,
         damageMod: options.damageMod ?? actorRollData.mod.damage.value,
         healingMod: options.healingMod ?? actorRollData.mod.healing.value,
         img: itemRollData.img
      };

      // Determine the skill training and expertise
      if (!options.skill || options.skill === 'none') {
         parameters.skill = itemRollData.skill;
      }
      else {
         parameters.skill = options.skill;
      }
      const skillData = actorRollData.skill[parameters.skill];
      parameters.skillTrainingDice = skillData.training.value;
      parameters.skillExpertise = skillData.expertise.value;

      // Determine the attribute die
      if (!options.attribute || options.attribute === 'default') {
         parameters.attribute === itemRollData.attribute;
      }
      else {
         parameters.attribute = options.attribute;
      }
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;


      // Calculate the total training dice
      let totalTrainingDice = parameters.skillTrainingDice + parameters.trainingMod;
      if (parameters.doubleTraining) {
         totalTrainingDice *= 2;
      }

      // Add the training dice to the total dice
      parameters.totalDice = parameters.diceMod + parameters.attributeDice + totalTrainingDice;

      // Calculcate the total expertise
      let totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
      if (parameters.doubleExpertise) {
         totalExpertise *= 2;
      }
      parameters.totalExpertise = totalExpertise;

      return parameters;
   }

   _calculateResults(inResults, parameters) {
      return calculateCastingCheckResults(inResults, parameters);
   }

   _getCheckType() {
      return 'castingCheck';
   }
}
