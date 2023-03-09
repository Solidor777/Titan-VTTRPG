import { clamp } from '~/helpers/Utility';
import TitanCheck from '~/check/Check.js';
import calculateAttackCheckResults from '~/check/types/attack-check/CalculateAttackCheckResults';

export default class TitanAttackCheck extends TitanCheck {
   _ensureValidConstruction(options) {
      // Check if actor roll data was provided
      if (!options?.actorRollData) {
         console.error('TITAN | Attack Check failed during construction. No provided Actor Roll Data.');
         console.trace();

         return false;
      }

      // Check if the weapon is valid
      const itemRollData = options.itemRollData;
      if (!itemRollData) {
         console.error(`TITAN | Attack Check failed during construction. No provided Item Roll Data.`);
         console.trace();

         return false;
      }

      // Check if the attack is valid
      if (!itemRollData.attack[options.attackIdx]) {
         console.error(`TITAN | Attack Check failed during construction. Invalid Attack IDX (${options.attackIdx}).`);
         console.trace();

         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      // Cache values for easy reference
      const actorRollData = options.actorRollData;
      const itemRollData = options.itemRollData;
      const targetRollData = options.targetRollData;
      const attackData = options.attack;

      // Initialize base parameters
      const parameters = {
         attack: attackData,
         attackNotes: itemRollData.attackNotes,
         complexity: 1,
         damageMod: options.damageMod ?? actorRollData.mod.damage.value,
         diceMod: options?.diceMod ?? 0,
         doubleExpertise: options?.doubleExpertise ?? false,
         doubleTraining: options.doubleTraining ?? 0,
         expertiseMod: options.expertiseMod ?? 0,
         extraFailureOnCritical: options?.extraFailureOnCritical ?? false,
         extraSuccessOnCritical: options?.extraSuccessOnCritical ?? false,
         img: itemRollData.img,
         itemName: itemRollData.name,
         itemTrait: itemRollData.customTrait,
         maximizeSuccesses: options?.maximizeSuccesses ?? false,
         multiAttack: options.multiAttack ?? itemRollData.multiAttack,
         trainingMod: options.trainingMod ?? 0,
         type: options.type ?? attackData.type,
      };

      // Determine the skill training and expertise
      if (!options.skill || options.skill === 'none') {
         parameters.skill = attackData.skill;
      }
      else {
         parameters.skill = options.skill;
      }
      const skillData = actorRollData.skill[parameters.skill];
      parameters.skillTrainingDice = skillData.training.value;
      parameters.skillExpertise = skillData.expertise.value;

      // Determine the attribute dice
      if (!options.attribute && options.attribute !== 'default') {
         parameters.attribute = attackData.attribute;
      }
      else {
         parameters.attribute = actorRollData.skill[parameters.skill].defaultAttribute;
      }
      parameters.attributeDice = actorRollData.attribute[parameters.attribute].value;

      // Determine the target defense
      if (isNaN(options.targetDefense)) {
         if (targetRollData) {
            parameters.targetDefense = targetRollData.rating.defense.value;
         }
      }
      else {
         parameters.targetDefense = options.targetDefense;
      }

      // Calculate the difficulty if difficulty was not provided
      if (!options.difficulty) {
         // If the target is valid
         if (!isNaN(parameters.targetDefense)) {
            // Calculate the attacker rating
            parameters.attackerRating =
               parameters.type === 'melee' ?
                  (isNaN(options.attackerMelee) ? actorRollData.rating.melee.value : options.attackerMelee) :
                  (isNaN(options.attackerAccuracy) ? actorRollData.rating.accuracy.value : options.attackerAccuracy);

            // Difficulty = 4 + defense rating - attacker rating
            parameters.difficulty = clamp(parameters.targetDefense - parameters.attackerRating + 4, 2, 6);
         }
         else {
            parameters.difficulty = 4;
         }
      }
      else {
         parameters.difficulty = clamp(options.difficulty, 2, 6);
      }

      // Calculate the total training dice
      let totalTrainingDice = parameters.skillTrainingDice + parameters.trainingMod;
      if (parameters.doubleTraining) {
         totalTrainingDice *= 2;
      }
      parameters.totalTrainingDice = totalTrainingDice;

      // Add the training dice to the total dice
      parameters.totalDice = parameters.diceMod + parameters.attributeDice + totalTrainingDice;

      // Calculcate the total expertise
      let totalExpertise = parameters.skillExpertise + parameters.expertiseMod;
      if (parameters.doubleExpertise) {
         totalExpertise *= 2;
      }
      parameters.totalExpertise = totalExpertise;

      // Calculate attack traits that can effect successes and damage
      // Determine whether the attack has the multi attack trait
      for (let idx = 0; idx < attackData.trait.length; idx++) {
         switch (attackData.trait[idx].name) {
            case 'flurry': {
               parameters.flurry = true;
               break;
            }
            case 'cleave': {
               parameters.cleave = true;
               break;
            }
            case 'rend': {
               parameters.rend = true;
               break;
            }
            case 'magical': {
               parameters.magical = true;
               break;
            }
            case 'ineffective': {
               parameters.ineffective = true;
               break;
            }
            case 'penetrating': {
               parameters.penetrating = true;
               break;
            }
            default: {
               break;
            }
         }
         if (attackData.trait[idx].name === 'flurry') {
            parameters.flurry = true;
            break;
         }
      }

      // Adjust the dice and expertise if this is a multi-attack
      if (parameters.multiAttack) {

         // Determine whether the attack has the multi attack trait
         for (let idx = 0; idx < attackData.trait.length; idx++) {
            if (attackData.trait[idx].name === 'flurry') {
               parameters.flurry = true;
               break;
            }
         }

         // Round the total dice up if this is a dual attack
         // Otherwise, round down
         parameters.totalDice = parameters.flurry ?
            Math.ceil(parameters.totalDice / 2) :
            Math.floor(parameters.totalDice / 2);

         // Round the expertise down
         parameters.totalExpertise = Math.floor(parameters.totalExpertise / 2);
      }

      return parameters;
   }

   _calculateResults(inResults, parameters) {
      return calculateAttackCheckResults(inResults, parameters);
   }

   _getCheckType() {
      return 'attackCheck';
   }
}
