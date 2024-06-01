/**
 * Calculated parameters for the creation of a new Attribute Check, based off an Actor's data.
 * @typedef {CheckParameters} AttributeCheckParameters
 * @property {boolean} doubleExpertise Whether to double the Expertise applied.
 * @property {boolean} doubleTraining Whether to double the Training applied.
 * @property {boolean} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number} attributeDice The number of dice granted by the attribute.
 * @property {number} complexity The minimum number of Successes needed.
 * @property {number} damageToReduce Base amount of damage to be reduced by this check if any.
 * @property {number} diceMod Modifier for the number of Dice being rolled.
 * @property {number} difficulty The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number} skillExpertise The amount of expertise granted by the skill.
 * @property {number} skillTrainingDice The number of dice granted by the skill.
 * @property {number} totalDice The total number of dice to be rolled.
 * @property {number} totalExpertise The total amount of expertise to apply.
 * @property {number} totalTrainingDice The total number of training dice to be rolled.
 * @property {number} trainingMod Modifier for the amount of Training to be applied.
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} skill The Skill to use for the Check.
 */

/**
 * Creates an Attribute Check Parameters object, based off the provided input.
 * @param {AttributeCheckOptions} options - Fully populated Attribute Check Options.
 * @returns {AttributeCheckParameters} The new Attribute Check Parameters.
 */
export default function createAttributeCheckParameters(options) {
   return {
      attribute: options.attribute,
      attributeDice: 0,
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      skill: options.skill,
      skillExpertise: 0,
      skillTrainingDice: 0,
      totalDice: 0,
      totalExpertise: 0,
      totalTrainingDice: 0,
      trainingMod: options.trainingMod,
   };
}
