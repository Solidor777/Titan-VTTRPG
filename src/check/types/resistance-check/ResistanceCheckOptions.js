/**
 * Options for requesting a Resistance Check from an Actor.
 * @typedef {CheckOptions} ResistanceCheckOptions
 * @property {boolean} [automaticFailure] - Whether the check fails automatically; its dice still roll.
 * @property {boolean} [doubleExpertise] - Whether to double the Expertise applied.
 * @property {boolean} [extraFailureOnCritical] - Whether a roll of 1 equals a negative success.
 * @property {boolean} [extraSuccessOnCritical] - Whether a roll of 6 equals an extra success.
 * @property {number} [advantage] - The summed Advantage (+) and Disadvantage (-) from always-on sources and the dialog.
 * @property {number} [complexity] - The minimum number of Successes needed to succeed at the Check.
 * @property {number} [damageToReduce] - Base amount of damage to be reduced by this check if any.
 * @property {number} [diceMod] - Modifier for the number of Dice being rolled.
 * @property {number} [difficulty] - The Difficulty before Advantage.
 * @property {number} [expertiseMod] - Modifier for the amount of Expertise to be applied.
 * @property {string} [resistance] - The Resistance to roll for the Check.
 * @property {string[]} [situations] - The camel-case keys of the situational modifiers ticked in the check dialog.
 */

/**
 * Creates a Resistance Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {ResistanceCheckOptions} The new, fully-populated Resistance Check Options.
 */
export default function createResistanceCheckOptions(options) {
   return {
      advantage: options.advantage ?? 0,
      automaticFailure: options.automaticFailure ?? false,
      complexity: options.complexity ?? 0,
      damageToReduce: options.damageToReduce ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ?? 4,
      doubleExpertise: options.doubleExpertise ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      resistance: options.resistance,
      situations: options.situations ?? [],
   };
}
