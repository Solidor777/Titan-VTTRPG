import { clamp } from '~/helpers/Utility.js';
import calculateItemCheckResults from './CalculateItemCheckResults';
import TitanCheck from '~/check/Check.js';

export default class TitanItemCheck extends TitanCheck {
   _ensureValidConstruction(options) {
      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error('TITAN | Item Check failed during construction. No provided Actor Roll Data.');
         console.trace();

         return false;
      }

      // Check if the item is valid
      const itemRollData = options.itemRollData;
      if (!itemRollData) {
         console.error(`TITAN | Item Check failed during construction. No provided Item Roll Data.`);
         console.trace();

         return false;
      }

      // Check if the check is valid
      const itemCheckData = itemRollData.check[options.checkIdx];
      if (!itemCheckData) {
         console.error(`TITAN | Item Check failed during construction. Invalid Check IDX (${options.checkIdx}).`);
         console.trace();

         return false;
      }

      // Ensure a valid attribute / skill combination
      const skill = options.skill ?? itemCheckData.skill;
      const attribute = options.attribute ?? itemCheckData.attribute;
      if ((!skill || skill === 'none') && (!attribute || attribute === 'default')) {
         console.error('TITAN | Item Check failed during construction. Neither skill nor attribute were provided.');
         console.trace();

         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      // Cache data for later
      const actorRollData = options.actorRollData;
      const itemRollData = options.itemRollData;
      const itemCheckData = itemRollData.check[options.checkIdx];

      // Initializ base parameters
      const parameters = {
         difficulty: options.difficulty ? clamp(options.difficulty, 2, 6) : clamp(itemCheckData.difficulty, 2, 6),
         complexity: options.complexity ? Math.max(0, options.complexity) : Math.max(itemCheckData.complexity, 0),
         diceMod: options.diceMod ?? 0,
         trainingMod: options.TrainingMod ?? 0,
         expertiseMod: options.expertiseMod ?? 0,
         doubleExpertise: options.doubleExpertise ?? false,
         maximizeSuccesses: options.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options.extraFailureOnCritical ?? false,
         img: itemRollData.img,
         itemName: itemRollData.name,
         resolveCost: options.resolveCost ?? itemCheckData.resolveCost,
         isDamage: options.isDamage ?? itemCheckData.isDamage,
         isHealing: options.isHealing ?? itemCheckData.isHealing,
         resistanceCheck: options.resistanceCheck ?? itemCheckData.resistanceCheck
      };
      parameters.totalDice = parameters.diceMod;

      // Determine the skill training and expertise
      const skill = options.skill ?? itemCheckData.skill;
      if (skill && skill !== 'none') {
         parameters.skill = skill;

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
      const attribute = options.attribute ?? itemCheckData.attribute;
      if (attribute && attribute !== 'default') {
         parameters.attribute = attribute;
      }
      else {
         parameters.attribute = actorRollData.skill[parameters.skill].defaultAttribute;
      }
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;
      parameters.totalDice += parameters.attributeDice;

      // Get damage and healing specific parameters
      if (parameters.isDamage || parameters.isHealing) {
         parameters.initialValue = options.initialValue ?? itemCheckData.initialValue;
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
      // If no options override
      if (!options.opposedCheck) {

         // Use the item check data
         if (itemCheckData.opposedCheck.enabled === true) {
            parameters.opposedCheck = {
               attribute: itemCheckData.opposedCheck.attribute ?? 'body',
               skill: itemCheckData.opposedCheck.skill ?? 'none',
               difficulty: itemCheckData.opposedCheck.difficulty ? clamp(itemCheckData.opposedCheck.difficulty, 2, 6) : 4,
            };
         }
      }
      else {
         // Use the override
         const opposedCheck = options.opposedCheck;
         const itemCheck = options.itemCheckData.opposedCheck;
         parameters.opposedCheck = {
            attribute: opposedCheck.attribute ?? itemCheck.attribute,
            skill: opposedCheck.skill ?? itemCheck.skill,
            difficulty: opposedCheck.difficulty ? clamp(opposedCheck.difficulty, 2, 6) : clamp(itemCheck.difficulty, 2, 6),
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