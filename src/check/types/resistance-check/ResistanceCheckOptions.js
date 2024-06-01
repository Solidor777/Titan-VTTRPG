/**
 * Options for requesting a Resistance Check from an Actor.
 * @typedef {CheckOptions} ResistanceCheckOptions
 * @property {boolean?} doubleExpertise Whether to double the Expertise applied.
 * @property {boolean?} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number?} complexity The minimum number of Successes needed.
 * @property {number?} damageToReduce Base amount of damage to be reduced by this check if any.
 * @property {number?} diceMod Modifier for the number of Dice being rolled.
 * @property {number?} difficulty The minimum roll on a die to achieve a Success.
 * @property {number?} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {string?} resistance The Resistance to roll for the Check.
 */

/**
 * Creates a Resistance Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {ResistanceCheckOptions} The new, fully-populated Resistance Check Options.
 */
export default function createResistanceCheckOptions(options) {
   return {
      complexity: options.complexity ?? 0,
      damageToReduce: options.damageToReduce ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ?? 4,
      doubleExpertise: options.doubleExpertise ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      resistance: options.resistance,
   };
}
