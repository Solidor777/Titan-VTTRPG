/**
 * Base data for a scaling aspect used in the check.
 * @typedef {object} ScalingAspectBase
 * @property {boolean} isDamage - Whether the aspect applies damage.
 * @property {boolean} isHealing - Whether the aspect applies healing.
 * @property {number} cost - The success cost for increasing the value of the aspect.
 * @property {number} initialValue - The initial value of the aspect.
 * @property {string} label - The display name for the aspect.
 */

/**
 * Calculated parameters for the creation of a new Casting Check, based off an Actor's data.
 * @typedef {CheckParameters} CastingCheckParameters
 * @property {boolean} doubleExpertise - Whether to double the Expertise applied.
 * @property {boolean} doubleTraining - Whether to double the Training applied.
 * @property {boolean} extraFailureOnCritical - Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical - Whether a roll of 6 equals an extra success.
 * @property {boolean} reflexesCheck - Whether the effects can be resisted with a Reflexes check.
 * @property {boolean} resilienceCheck - Whether the effects can be resisted with a Resilience check.
 * @property {boolean} willpowerCheck - Whether the effects can be resisted with a Willpower check.
 * @property {number} attributeDice - The number of dice granted by the attribute.
 * @property {number} complexity - The minimum number of Successes needed to succeed at the Check.
 * @property {number} damage - The minimum Damage to apply on a successful check.
 * @property {number} damageMod - Modifier for the amount of Damage to be inflicted.
 * @property {number} diceMod - Modifier for the number of Dice being rolled.
 * @property {number} difficulty - The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod - Modifier for the amount of Expertise to be applied.
 * @property {number} healing - The minimum Healing to apply on a successful check.
 * @property {number} healingMod - Modifier for the amount of healing to be applied.
 * @property {number} skillExpertise - The amount of expertise granted by the skill.
 * @property {number} skillTrainingDice - The number of dice granted by the skill.
 * @property {number} totalDice - The total number of dice to be rolled.
 * @property {number} totalExpertise - The total amount of expertise to apply.
 * @property {number} totalTrainingDice - The total number of training dice to be rolled.
 * @property {number} trainingMod - Modifier for the amount of Training to be applied.
 * @property {ScalingAspectBase[]} scalingAspect - Array of scaling spell aspects.
 * @property {string[]} customTrait - Array of custom traits applied to the item.
 * @property {string} attribute - The Attribute to use for the Check.
 * @property {string} img - The image to display with the check.
 * @property {string} itemDescription - The description of the item being rolled.
 * @property {string} itemName - The name of the item being rolled.
 * @property {string} skill - The Skill to use for the Check.
 * @property {string} tradition - The tradition of the spell being rolled.
 */

/**
 * Builds the zero-value shape of a Casting Check's parameters.
 * All numeric fields default to 0, boolean fields to false, string fields to '', and arrays to [].
 * Option-derived values are set to their zero/empty defaults; there are no factory constants
 * for this check type.
 * @returns {CastingCheckParameters} The casting check-parameters shape (zeroed).
 */
export function createCastingCheckParametersShape() {
   return {
      attribute: '', attributeDice: 0, complexity: 0, customTrait: [], damage: 0, damageMod: 0,
      diceMod: 0, difficulty: 0, doubleExpertise: false, doubleTraining: false, expertiseMod: 0,
      extraFailureOnCritical: false, extraSuccessOnCritical: false, healing: 0, healingMod: 0, img: '',
      itemDescription: '', itemName: '', reflexesCheck: false, resilienceCheck: false, scalingAspect: [],
      skill: '', skillExpertise: 0, skillTrainingDice: 0, totalDice: 0, totalExpertise: 0,
      totalTrainingDice: 0, tradition: '',
      trainingMod: 0, willpowerCheck: false,
   };
}

/**
 * Creates a Casting Check Parameters object, based off the provided input.
 * Spreads the zero-value shape first, then re-assigns every option-derived field.
 * @param {CastingCheckOptions} options - Fully populated Casting Check Options.
 * @returns {CastingCheckParameters} The new Casting Check Parameters.
 */
export default function createCastingCheckParameters(options) {
   return {
      ...createCastingCheckParametersShape(),
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
      skill: options.skill,
      trainingMod: options.trainingMod,
   };
}
