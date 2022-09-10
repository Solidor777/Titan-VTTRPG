import TitanUtility from "~/helpers/Utility.js";
import TitanCheck from "~/check/Check.js";

export default class TitanItemCheck extends TitanCheck {
   _initializeParameters(options) {
      // Get default parameters
      const parameters = {
         attribute: options?.attribute ?? "body",
         skill: options?.skill ?? false,
         difficulty: options?.difficulty ?? 4,
         complexity: options?.complexity ?? 1,
         resolveCost: options?.resolveCost ?? 0,
         isDamage: options?.isDamage ?? false,
         isHealing: options?.isHealing ?? false,
         resistanceCheck: options?.resistanceCheck ?? false,
         opposedCheck: options?.opposedCheck?.enabled ? options.opposedCheck : false,
         diceMod: options?.diceMod ?? 0,
         maximizeSuccesses: options?.maximizeSuccesses ?? false,
         extraSuccessOnCritical: options?.extraSuccessOnCritical ?? false,
         extraFailureOnCritical: options?.extraFailureOnCritical ?? false,
         img: options?.img ?? false,
         itemName: options?.itemName ?? false,
         label: options?.label ?? false
      };


      // Get damage and healing specific parameters
      if (parameters.isDamage || parameters.isHealing) {
         parameters.initialValue = options.initialValue ?? 1;
         parameters.scaling = options.scaling ?? true;

         // Damage specific parameters
         if (parameters.isDamage) {
            parameters.damageMod = options.damageMod ?? 0;
         }
      }

      // Skill specific parameters
      if (parameters.skill) {
         parameters.trainingMod = options.trainingMod ?? 0;
         parameters.expertiseMod = options.expertiseMod ?? 0;
         parameters.doubleTraing = options.doubleTraining ?? false;
         parameters.doubleExpertise = options.doubleExpertise ?? false;
      }

      return parameters;
   }

   _calculateDerivedData(options) {
      const actorRollData = options.actorRollData;

      // Get the attribute dice
      this.parameters.attributeDice = actorRollData.attribute[this.parameters.attribute].value;

      // Get the skill training and expertise values
      if (this.parameters.skill) {
         const skill = actorRollData.skill[this.parameters.skill];
         this.parameters.skillTrainingDice = skill.training.value;
         this.parameters.skillExpertise = skill.expertise.value;
      }

      return;
   }

   _calculateTotalDiceAndExpertise() {
      // Calculate the total dice
      this.parameters.totalDice = this.parameters.diceMod + this.parameters.attributeDice;

      // Add skill dice traing if appropriate
      if (this.parameters.skill !== false) {
         this.parameters.totalDice += (this.parameters.skillTrainingDice * this.parameters.doubleTraining ? 2 : 1);

         // Add skill expertise
         this.parameters.totalExpertise = this.parameters.skillExpertise + this.parameters.expertiseMod * this.parameters.doubleExpertise ? 2 : 1;
      }

      return;
   }

   _calculateResults() {
      const results = super._calculateResults();
      // Add the damage to the results
      if (results.succeeded) {

         // If damage or healing
         if (this.parameters.isDamage || this.parameters.isHealing) {
            // Calculate stat
            let stat = this.parameters.initialValue;

            // Calculate scaling state 
            if (results.extraSuccesses && this.parameters.scaling) {
               stat += results.extraSuccesses;
            }

            // Set damage
            if (this.parameters.isDamage) {
               results.damage = stat + this.parameters.damageMod;
            }

            // Set healing
            if (this.parameters.isHealing) {
               results.isHealing = stat;
            }
         }
      }

      return results;
   }

   _getChatContext(options) {
      // Create the context object
      const chatContext = {
         parameters: this.parameters,
         results: this.results,
         type: this._getCheckType(),
         img: this.parameters.img
      };

      // Initialize labels
      if (this.parameters.label) {
         chatContext.label = this.parameters.label;
         chatContext.subLabels = [];
         if (this.parameters.itemName) {
            chatContext.subLabels.push(this.parameters.itemName);
         }
         chatContext.subLabels.push(this._getTypeLabel());
      }
      else if (this.parameters.itemName) {
         chatContext.subLabels = [];
         chatContext.label = this.parameters.label;
         chatContext.subLabels.push(this._getTypeLabel());
      }
      else {
         chatContext.label = this._getTypeLabel();
      }

      return chatContext;
   }

   _getCheckType() {
      return "itemCheck";
   }

   _getTypeLabel() {
      return `${game.i18n.localize(CONFIG.TITAN.local[this.parameters.attribute])} (${game.i18n.localize(CONFIG.TITAN.local[this.parameters.skill])}) ${this.parameters.difficulty}:${this.parameters.complexity}`;
   }
}
