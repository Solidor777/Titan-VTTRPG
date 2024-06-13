/**
 * Options for requesting a Casting Check from an Actor.
 * @typedef {CheckOptions} CastingCheckOptions
 * @property {boolean?} doubleExpertise Whether to double the Expertise applied.
 * @property {boolean?} doubleTraining Whether to double the Training applied.
 * @property {boolean?} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {number?} complexity The minimum number of Successes needed to succeed at the Check.
 * @property {number?} damageMod Modifier for the amount of Damage to be inflicted.
 * @property {number?} difficulty The minimum roll on a die to achieve a Success.
 * @property {number?} diceMod Modifier for the number of Dice being rolled.
 * @property {number?} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number?} healingMod Modifier for the amount of Healing to be applied.
 * @property {number?} trainingMod Modifier for the amount of Training to be applied.
 * @property {string?} attribute The Attribute to use for the Check.
 * @property {string} itemId The the ID of the spell being cast for the attack.
 * @property {string?} skill The Skill to use for the Check.
 */

/**
 * Creates a Casting Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {CastingCheckOptions} The new, fully-populated Casting Check Options.
 */
export default function createCastingCheckOptions(options) {
   return {
      attribute: options.attribute ?? 'default',
      complexity: options.complexity ?? 1,
      damageMod: options.damageMod ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ?? 4,
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      healingMod: options.healingMod ?? 0,
      itemId: options.itemId,
      skill: options.skill ?? 'default',
      trainingMod: options.trainingMod ?? 0,
   };
}
