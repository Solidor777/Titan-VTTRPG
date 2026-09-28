/**
 * Options for requesting a Casting Check from an Actor.
 * @typedef {CheckOptions} CastingCheckOptions
 * @property {boolean} [automaticFailure] - Whether the check fails automatically; its dice still roll.
 * @property {boolean} [doubleExpertise] - Whether to double the Expertise applied.
 * @property {boolean} [doubleTraining] - Whether to double the Training applied.
 * @property {boolean} [extraFailureOnCritical] - Whether a roll of 1 equals a negative success.
 * @property {boolean} [extraSuccessOnCritical] - Whether a roll of 6 equals an extra success.
 * @property {number} [advantage] - The summed Advantage (+) and Disadvantage (-) from always-on sources and the dialog.
 * @property {number} [complexity] - The minimum number of Successes needed to succeed at the Check.
 * @property {number} [damageMod] - Modifier for the amount of Damage to be inflicted.
 * @property {number} [difficulty] - The Difficulty before Advantage.
 * @property {number} [diceMod] - Modifier for the number of Dice being rolled.
 * @property {number} [expertiseMod] - Modifier for the amount of Expertise to be applied.
 * @property {number} [healingMod] - Modifier for the amount of Healing to be applied.
 * @property {number} [trainingMod] - Modifier for the amount of Training to be applied.
 * @property {string} [attribute] - The Attribute to use for the Check.
 * @property {string} itemId - The ID of the spell being cast for the casting check.
 * @property {string} [skill] - The Skill to use for the Check.
 * @property {string[]} [situations] - The camel-case keys of the situational modifiers ticked in the check dialog.
 */

/**
 * Creates a Casting Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {CastingCheckOptions} The new, fully-populated Casting Check Options.
 */
export default function createCastingCheckOptions(options) {
   return {
      advantage: options.advantage ?? 0,
      attribute: options.attribute ?? 'default',
      automaticFailure: options.automaticFailure ?? false,
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
      situations: options.situations ?? [],
      skill: options.skill ?? 'default',
      trainingMod: options.trainingMod ?? 0,
   };
}
