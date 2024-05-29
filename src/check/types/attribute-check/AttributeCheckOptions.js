/**
 * Options for requesting an Attribute Check from an Actor.
 * @typedef {object} AttributeCheckOptions
 * @property {boolean?} doubleExpertise Whether to double the Expertise applied.
 * @property {boolean?} doubleTraining Whether to double the Training applied.
 * @property {boolean?} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number?} complexity The minimum number of Successes needed.
 * @property {number?} damageToReduce Base amount of damage to be reduced by this check if any.
 * @property {number?} diceMod Modifier for the number of Dice being rolled.
 * @property {number?} difficulty The minimum roll on a die to achieve a Success.
 * @property {number?} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number?} trainingMod Modifier for the amount of Training to be applied.
 * @property {string?} attribute The Attribute to use for the Check.
 * @property {string?} skill The Skill to use for the Check.
 * @augments CheckOptions
 */

/**
 * Creates an Attribute Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {AttributeCheckOptions} The new, fully-populated Attribute Check Options.
 */
export default function createAttributeCheckOptions(options) {
   return {
      attribute: options.attribute ?? 'default',
      complexity: options.complexity ?? 0,
      damageToReduce: options.damageToReduce ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ?? 4,
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      skill: options.skill ?? 'none',
      trainingMod: options.trainingMod ?? 0,
   };
}
