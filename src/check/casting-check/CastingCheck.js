import TitanSkillCheck from "~/check/skill-check/SkillCheck.js";

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
         spellName:
            options.spellName ??
            game.i18n.localize(CONFIG.TITAN.spell.label),
         spellAspects: options.spellAspects ?? false
      };

      return parameters;
   }

   _calculateDerivedData(options) {
      // Get the spell reference
      const actorRollData = options.actorRollData;
      const spellRollData = options.spellRollData;

      // Get the skill training and expertise value
      super._calculateDerivedData(options);

      // Get the spell description
      if (spellRollData.spellDescription) {
         this.parameters.spellDescription = spellRollData.spellDescription;
      }

      // Get the damage mod
      this.parameters.damageMod = options.DamageMod ?? actorRollData.system.mod.damage.value;

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
      // Add the damage to the results
      if (results.succeeded) {
         results.damage =
            this.parameters.casting.damage + this.parameters.damageMod + 1;

         // Add extra damage if appropriate
         if (results.extraSuccesses && this.parameters.casting.plusSuccessDamage) {
            results.damage += results.extraSuccesses;
         }
      }

      return results;
   }

   _getChatContext(options) {
      // Create the context object
      const chatContext = {
         label: this.parameters.spellName,
         typeLabel: this._getTypeLabel(),
         parameters: this.parameters,
         results: this.results,
         type: this._getCheckType(),
      };
      if (options?.label) {
         chatContext.typeLabel = this._getTypeLabel();
      }

      return chatContext;
   }

   _getCheckType() {
      return "castingCheck";
   }
}
