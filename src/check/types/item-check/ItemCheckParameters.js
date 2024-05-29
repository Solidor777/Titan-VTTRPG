/**
 * Data for an opposed check.
 * @typedef {object} OpposedCheck
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} skill The Skill to use for the Check.
 */

/**
 * Options for requesting an Item Check from an Actor.
 * @typedef {object} ItemCheckParameters
 * @property {object|boolean} opposedCheck Opposed check data, if any.
 * @property {boolean} doubleExpertise Whether to double the Expertise applied.
 * @property {boolean} doubleTraining Whether to double the Training applied.
 * @property {boolean} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {boolean} scaling Whether subsequent successes should scale the initial value.
 * @property {number} attributeDice The number of dice granted by the attribute.
 * @property {number} complexity The minimum number of Successes needed.
 * @property {number} damage The minimum Damage to apply on a successful check.
 * @property {number} damageMod Modifier for the amount of Damage to be inflicted.
 * @property {number} diceMod Modifier for the number of Dice being rolled.
 * @property {number} difficulty The minimum roll on a die to achieve a Success.
 * @property {number} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number} healing The minimum Healing to apply on a successful check.
 * @property {number} healingMod Modifier for the amount of healing to be applied.
 * @property {number} resolveCost The resolve cost for performing the check, if any.
 * @property {number} skillExpertise The amount of expertise granted by the skill.
 * @property {number} skillTrainingDice The number of dice granted by the skill.
 * @property {number} totalDice The total number of dice to be rolled.
 * @property {number} totalExpertise The total amount of expertise to apply.
 * @property {number} totalTrainingDice The total number of training dice to be rolled.
 * @property {number} trainingMod Modifier for the amount of Training to be applied.
 * @property {string[]} customTrait Array of custom traits applied to the item.
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} checkLabel The display name of the check.
 * @property {string} damageReducedBy Whether Damage from this check can be reduced by an Opposed Check, or a
 * Resistance Check.
 * @property {string} img The image to display with the check.
 * @property {string} itemDescription The description of the item being rolled.
 * @property {string} itemName The name of the item being rolled.
 * @property {string} resistanceCheck The Resistance that can be used to oppose this check.
 * @property {string} skill The Skill to use for the Check.
 * @augments CheckParameters
 */

/**
 * Creates a Casting Check Options object, based off the provided input.
 * @param {ItemCheckOptions} options - Fully populated Item Check Options.
 * @returns {ItemCheckParameters} The new Item Check Parameters.
 */
export default function createItemCheckParameters(options) {
   return {
      attribute: options.attribute,
      attributeDice: 0,
      checkLabel: '',
      complexity: options.complexity,
      customTrait: [],
      damage: 0,
      damageMod: options.damageMod,
      damageReducedBy: 'none',
      diceMod: options.diceMod,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      healing: 0,
      healingMod: options.healingMod,
      img: '',
      itemDescription: '',
      itemName: '',
      opposedCheck: false,
      resistanceCheck: '',
      resolveCost: options.resolveCost,
      scaling: false,
      skill: options.skill,
      skillExpertise: 0,
      skillTrainingDice: 0,
      totalDice: 0,
      totalExpertise: 0,
      totalTrainingDice: 0,
      trainingMod: options.trainingMod,
   };
}
