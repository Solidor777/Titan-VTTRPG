/**
 * Nested opposed-check configuration shared by item-check parameters.
 * @typedef {object} OpposedCheckBase
 * @property {boolean} enabled - Whether the opposed check is enabled.
 * @property {string} attribute - The attribute used for the opposed check.
 * @property {string} skill - The skill used for the opposed check.
 */

/**
 * Options for requesting an Item Check from an Actor.
 * @typedef {CheckParameters} ItemCheckParameters
 * @property {OpposedCheckBase} opposedCheck - The opposed check data (enabled/attribute/skill).
 * @property {boolean} isDamage - Whether the check inflicts damage.
 * @property {boolean} isHealing - Whether the check heals damage.
 * @property {boolean} doubleExpertise - Whether to double the Expertise applied.
 * @property {boolean} doubleTraining - Whether to double the Training applied.
 * @property {boolean} extraFailureOnCritical - Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical - Whether a roll of 6 equals an extra success.
 * @property {boolean} scaling - Whether subsequent successes should scale the initial value.
 * @property {number} attributeDice - The number of dice granted by the attribute.
 * @property {number} complexity - The minimum number of Successes needed to succeed at the Check.
 * @property {number} damage - The minimum Damage to apply on a successful check.
 * @property {number} damageMod - Modifier for the amount of Damage to be inflicted.
 * @property {number} diceMod - Modifier for the number of Dice being rolled.
 * @property {number} difficulty - The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod - Modifier for the amount of Expertise to be applied.
 * @property {number} healing - The minimum Healing to apply on a successful check.
 * @property {number} healingMod - Modifier for the amount of healing to be applied.
 * @property {number} resolveCost - The resolve cost for performing the check, if any.
 * @property {number} skillExpertise - The amount of expertise granted by the skill.
 * @property {number} skillTrainingDice - The number of dice granted by the skill.
 * @property {number} totalDice - The total number of dice to be rolled.
 * @property {number} totalExpertise - The total amount of expertise to apply.
 * @property {number} totalTrainingDice - The total number of training dice to be rolled.
 * @property {number} trainingMod - Modifier for the amount of Training to be applied.
 * @property {string[]} customTrait - Array of custom traits applied to the item.
 * @property {string} attribute - The Attribute to use for the Check.
 * @property {string} checkLabel - The display name of the check.
 * @property {string} damageReducedBy - Whether Damage from this check can be
 * reduced by an Opposed Check, or a Resistance Check.
 * @property {string} img - The image to display with the check.
 * @property {string} itemDescription - The description of the item being rolled.
 * @property {string} itemName - The name of the item being rolled.
 * @property {string} resistanceCheck - The Resistance that can be used to oppose this check.
 * @property {string} skill - The Skill to use for the Check.
 */

/**
 * Builds the zero-value shape of an Item Check's parameters.
 * All numeric fields default to 0, boolean fields to false, string fields to '', and arrays to [].
 * The factory constant `damageReducedBy: 'none'` is kept at its canonical default value.
 * The nested `opposedCheck` object always uses the typed `OpposedCheckBase` structure.
 * @returns {ItemCheckParameters} The item check-parameters shape (with factory constants).
 */
export function createItemCheckParametersShape() {
   return {
      attribute: '', attributeDice: 0, checkLabel: '', complexity: 0, customTrait: [], damage: 0,
      damageMod: 0, damageReducedBy: 'none', diceMod: 0, difficulty: 0, doubleExpertise: false,
      doubleTraining: false, expertiseMod: 0, extraFailureOnCritical: false, extraSuccessOnCritical: false,
      healing: 0, healingMod: 0, img: '', isDamage: false, isHealing: false, itemDescription: '',
      itemName: '', opposedCheck: { attribute: '', enabled: false, skill: '' }, resistanceCheck: '',
      resolveCost: 0, scaling: false, skill: '', skillExpertise: 0, skillTrainingDice: 0, totalDice: 0,
      totalExpertise: 0, totalTrainingDice: 0, trainingMod: 0,
   };
}

/**
 * Creates an Item Check Parameters object, based off the provided input.
 * Spreads the zero-value shape first (which includes the factory constant `damageReducedBy: 'none'`
 * and the typed nested `opposedCheck` default), then re-assigns every option-derived field.
 * @param {ItemCheckOptions} options - Fully populated Item Check Options.
 * @returns {ItemCheckParameters} The new Item Check Parameters.
 */
export default function createItemCheckParameters(options) {
   return {
      ...createItemCheckParametersShape(),
      attribute: options.attribute,
      complexity: options.complexity,
      damageMod: options.damageMod,
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      healingMod: options.healingMod,
      resolveCost: options.resolveCost,
      skill: options.skill,
      trainingMod: options.trainingMod,
   };
}
