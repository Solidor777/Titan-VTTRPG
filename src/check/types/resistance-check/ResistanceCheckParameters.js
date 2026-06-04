/**
 * Calculated parameters for the creation of a new Resistance Check, based off an Actor's data.
 * @typedef {CheckParameters} ResistanceCheckParameters
 * @property {boolean} doubleExpertise - Whether to double the Expertise applied.
 * @property {boolean} extraFailureOnCritical - Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical - Whether a roll of 6 equals an extra success.
 * @property {number} complexity - The minimum number of Successes needed to succeed at the Check.
 * @property {number} damageToReduce - Base amount of damage to be reduced by this check if any.
 * @property {number} diceMod - Modifier for the number of Dice being rolled.
 * @property {number} difficulty - The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod - Modifier for the amount of Expertise to be applied.
 * @property {number} resistanceDice - The number of dice granted by the Resistance.
 * @property {number} totalDice - The total number of dice to be rolled.
 * @property {number} totalExpertise - The total amount of expertise to apply.
 * @property {string} resistance - The Resistance to roll for the Check.
 */

/**
 * Builds the zero-value shape of a Resistance Check's parameters.
 * All numeric fields default to 0, boolean fields to false, and string fields to ''.
 * Option-derived values are set to their zero/empty defaults; there are no factory constants
 * for this check type.
 * @returns {ResistanceCheckParameters} The resistance check-parameters shape (zeroed).
 */
export function createResistanceCheckParametersShape() {
   return {
      complexity: 0, damageToReduce: 0, diceMod: 0, difficulty: 0, doubleExpertise: false,
      expertiseMod: 0, extraFailureOnCritical: false, extraSuccessOnCritical: false, resistance: '',
      resistanceDice: 0, totalDice: 0, totalExpertise: 0,
   };
}

/**
 * Creates a Resistance Check Parameters object, based off the provided input.
 * Spreads the zero-value shape first, then re-assigns every option-derived field.
 * @param {ResistanceCheckOptions} options - Fully populated Resistance Check Options.
 * @returns {ResistanceCheckParameters} The new Resistance Check Parameters.
 */
export default function createResistanceCheckParameters(options) {
   return {
      ...createResistanceCheckParametersShape(),
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      resistance: options.resistance,
   };
}
