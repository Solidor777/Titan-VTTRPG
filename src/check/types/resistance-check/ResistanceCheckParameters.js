/**
 * Calculated parameters for the creation of a new Resistance Check, based off an Actor's data.
 * @typedef {object} ResistanceCheckParameters
 * @augments CheckParameters
 * @property {boolean} doubleExpertise         Whether to double the Expertise to apply..
 * @property {boolean} extraFailureOnCritical  Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical  Whether a roll of 6 equals an extra success.
 * @property {number}  complexity              The minimum number of Successes needed.
 * @property {number}  damageToReduce          Base amount of damage to be reduced by this check if any.
 * @property {number}  diceMod                 Modifier for the number of Dice being rolled.
 * @property {number}  difficulty              The minimum roll on a die to achieve a Success.
 * @property {number}  expertiseMod            Modifier for the amount of Expertise to be applied.
 * @property {number}  totalDice               The total number of dice to be rolled.
 * @property {number}  totalExpertise          The total amount of expertise to apply.
 * @property {string}  resistance              The Resistance to roll for the Check.
 */

/**
 * Creates a Resistance Check Parameters object, based off the provided input.
 * @param   {ResistanceCheckOptions}    options  Fully populated Resistance Check Options.
 * @returns {ResistanceCheckParameters}          The new Resistance Check Parameters.
 */
export default function createResistanceCheckParameters(options) {
   return {
      complexity: options.complexity,
      damageToReduce: options.damageToReduce,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      resistance: options.resistance,
      resistanceDice: 0,
      totalDice: 0,
      totalExpertise: 0,
   };
}
