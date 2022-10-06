import { clamp, localize } from '~/helpers/Utility';
import TitanSkillCheck from '~/check/types/skill-check/SkillCheck.js';

export default class TitanAttackCheck extends TitanSkillCheck {
   _ensureValidConstruction(options) {
      if (!super._ensureValidConstruction(options)) {
         return false;
      }

      // Check if the weapon is valid
      const weaponRollData = options.weaponRollData;
      if (!weaponRollData) {
         console.error(
            `TITAN | Attack Check failed during construction. Invalid Data. ${options}`
         );
         return false;
      }

      // Check if the attack is valid
      const checkAttack = weaponRollData.attack[options.attackIdx];
      if (!checkAttack) {
         console.error(
            `TITAN | Attack Check failed during construction. Attack IDX. ${options}`
         );
         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      const parameters = {
         attribute: options.attribute ?? false,
         skill: options.skill ?? false,
         type: options.type ?? false,
         targetDefense: options.targetDefense ?? false,
         attackerMelee: options.attackerMelee ?? options.actorRollData.rating.melee.value,
         attackerAccuracy: options.attackerAccuracy ?? options.actorRollData.rating.accuracy.value,
         difficulty: options.difficulty ?? false,
         damageMod: options.damageMod ?? options.actorRollData.mod.damage.value,
         complexity: 1,
         diceMod: options.diceMod ?? 0,
         trainingMod: options.trainingMod ?? 0,
         expertiseMod: options.expertiseMod ?? 0,
         doubleExpertise: options.doubleExpertise ?? false,
         maximizeSuccesses: options.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options.extraFailureOnCritical ?? false,
         weaponName: options.weaponRollData.name,
         multiAttack: options.multiAttack ?? null,
         img: options.weaponRollData.img ?? false,
      };

      return parameters;
   }

   _calculateDerivedData(options) {
      // Get the weapon reference
      const weaponRollData = options.weaponRollData;
      const targetRollData = options.targetRollData;
      const checkAttack = weaponRollData.attack[options.attackIdx];

      // Get the skill
      if (!this.parameters.skill) {
         this.parameters.skill = checkAttack.skill;
      }

      // Get the attribute
      if (!this.parameters.attribute) {
         this.parameters.attribute = checkAttack.attribute;
      }

      // Get the skill training and expertise value
      super._calculateDerivedData(options);

      // Cache the attack info
      this.parameters.attack = checkAttack;

      // Cache the attack name
      this.parameters.attackName = checkAttack.label;

      // Get the attack description
      if (weaponRollData.attackNotes && weaponRollData.attackNotes.length > 0) {
         this.parameters.attackNotes = weaponRollData.attackNotes;
      }

      // Get the attack type
      if (!this.parameters.type) {
         this.parameters.type = checkAttack.type;
      }

      // Calculate defense rating ratings
      if (!this.parameters.targetDefense && targetRollData) {
         this.parameters.targetDefense = targetRollData.rating.defense.value;
      }

      // Calculate the difficulty if difficulty was not provided
      if (!this.parameters.difficulty) {
         // If the target is valid
         if (this.parameters.targetDefense !== false) {
            // Calculate the attacker rating
            const attackerRating =
               this.parameters.type === 'melee' ?
                  this.parameters.attackerMelee :
                  this.parameters.attackerAccuracy;

            // Difficulty = 4 + defense rating - attacker rating
            this.parameters.difficulty = clamp(
               this.parameters.targetDefense - attackerRating + 4,
               2,
               6
            );
         }
         else {
            this.parameters.difficulty = 4;
         }
      }

      // Calculate whether this is a multi-attack
      this.parameters.multiAttack = this.parameters.multiAttack ?? weaponRollData.multiAttack;

      // Calculate whether this is a dual attack
      if (this.parameters.multiAttack) {
         const traits = checkAttack.trait;
         for (let idx = 0; idx < traits.length; idx++) {
            if (traits[idx].name === 'multiAttack') {
               this.parameters.multiAttack = true;
               break;
            }
         }
      }

      return;
   }

   _calculateTotalDiceAndExpertise(rollData) {
      // Calculate the final total dice and expertise
      super._calculateTotalDiceAndExpertise(rollData);

      // Calculate the total training dice
      let totalTrainingDice =
         this.parameters.skillTrainingDice + this.parameters.trainingMod;
      if (this.parameters.doubleTraining) {
         totalTrainingDice *= 2;
      }

      // Add the training dice to the total dice
      this.parameters.totalDice =
         this.parameters.diceMod +
         this.parameters.attributeDice +
         totalTrainingDice;

      // Calculcate the total expertise
      let totalExpertise =
         this.parameters.skillExpertise + this.parameters.expertiseMod;
      if (this.parameters.doubleExpertise) {
         totalExpertise *= 2;
      }
      this.parameters.totalExpertise = totalExpertise;

      // Adjust the dice and expertise if this is a multi-attack
      if (this.parameters.multiAttack) {
         // Round the total dice up if this is a dual attack
         // Otherwise, round down
         this.parameters.totalDice = this.parameters.multiAttack ?
            Math.ceil(this.parameters.totalDice / 2) :
            Math.floor(this.parameters.totalDice / 2);

         // Round the expertise down
         this.parameters.totalExpertise = Math.floor(
            this.parameters.totalExpertise / 2
         );
      }

      return;
   }

   _calculateResults() {
      const results = super._calculateResults();
      // Add the damage to the results
      if (results.succeeded) {
         results.damage =
            this.parameters.attack.damage + this.parameters.damageMod + 1;

         // Add extra damage if appropriate
         if (results.extraSuccesses && this.parameters.attack.plusExtraSuccessDamage) {
            results.damage += results.extraSuccesses;
         }
      }

      return results;
   }

   _getCheckType() {
      return 'attackCheck';
   }
}
