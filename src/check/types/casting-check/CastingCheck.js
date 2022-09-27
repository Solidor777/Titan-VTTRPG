import TitanSkillCheck from '~/check/types/skill-check/SkillCheck.js';

export default class TitanCastingCheck extends TitanSkillCheck {
   _ensureValidConstruction(options) {
      if (!super._ensureValidConstruction(options)) {
         return false;
      }

      // Check if the spell is valid
      const spellRollData = options.spellRollData;
      if (!spellRollData) {
         console.error(
            `TITAN | Casting Check failed during construction. Invalid Data. ${options}`
         );
         return false;
      }

      return true;
   }

   _initializeParameters(options) {
      const parameters = {
         attribute: options.attribute ?? options.spellRollData.check.attribute,
         skill: options.skill ?? options.spellRollData.check.skill,
         difficulty: options.difficulty ?? options.spellRollData.check.difficulty,
         complexity: options.complexity ?? options.spellRollData.check.complexity,
         diceMod: options.diceMod ?? 0,
         trainingMod: options.trainingMod ?? 0,
         expertiseMod: options.expertiseMod ?? 0,
         doubleExpertise: options.doubleExpertise ?? false,
         maximizeSuccesses: options.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options.extraFailureOnCritical ?? false,
         spellName: options.spellRollData.name,
         aspects: options.spellRollData.aspect,
         damageMod: options.damageMod ?? options.actorRollData.mod.damage.value,
         img: options.spellRollData.img ?? false,
      };

      return parameters;
   }

   _calculateDerivedData(options) {
      // Get the spell reference
      const spellRollData = options.spellRollData;

      // Get the skill training and expertise value
      super._calculateDerivedData(options);

      // Get the spell description
      if (spellRollData.spellDescription) {
         this.parameters.spellDescription = spellRollData.spellDescription;
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

      // Adjust the dice and expertise if this is a multi-casting
      if (this.parameters.multiCasting) {
         // Round the total dice up if this is a dual casting
         // Otherwise, round down
         this.parameters.totalDice = this.parameters.multiCasting ?
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
      // Check if damage or healing is among the aspects
      if (results.succeeded) {

         // Initialize state data
         let scalingCount = 0;
         let scalingIdx = -1;
         results.extraSuccessesRemaining = results.extraSuccesses;

         // Adjust aspect results
         this.parameters.aspect.forEach((aspect, idx) => {
            // Damage
            if (aspect.isDamage) {
               results.damage = results.damage ? results.damage + aspect.initialValue : aspect.initialValue;
            }

            // Healing
            if (aspect.isHealing === true) {
               results.healing = results.healing ? results.healing + aspect.initialValue : aspect.initialValue;
            }

            // Current value
            aspect.currentValue = aspect.initialValue;

            // Scaling
            if (aspect.scaling) {
               scalingCount += 1;
               scalingIdx = idx;
            }

            // Resistance check
            if (aspect.resistanceCheck) {
               switch (aspect.resistanceCheck) {
                  case 'reflexes': {
                     results.reflexesCheck = true;
                     break;
                  }
                  case 'resilience': {
                     results.resilienceCheck = true;
                     break;
                  }
                  case 'willpower': {
                     results.willpowerCheck = true;
                     break;
                  }
                  default: {
                     break;
                  }
               }
            }
         });

         // If there is only one scaling
         if (scalingCount === 1 &&
            results.extraSuccesses &&
            results.extraSuccesses >= this.parameters.aspect[scalingIdx].cost) {

            // Maximize the aspect
            const aspect = this.parameters.aspect[scalingIdx];
            const delta = Math.floor(results.extraSuccesses / aspect.cost);
            const cost = delta * aspect.cost;
            aspect.currentValue += delta;
            results.extraSuccessesRemaining -= cost;

            // Update damage
            if (aspect.isDamage) {
               results.damage += delta;
            }

            // Update healing
            if (aspect.isHealing) {
               results.healing += delta;
            }
         }

         // Adjust final damage
         if (results.damage) {
            results.damage += this.parameters.damageMod;
         }
      }

      return results;
   }

   _getChatContext(options) {
      // Create the context object
      const chatContext = {
         label: this.parameters.spellName,
         subLabels: [this._getTypeLabel()],
         parameters: this.parameters,
         results: this.results,
         type: this._getCheckType(),
         img: this.parameters.img
      };

      return chatContext;
   }

   _getCheckType() {
      return 'castingCheck';
   }
}
