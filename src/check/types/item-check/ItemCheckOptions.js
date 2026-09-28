/**
 * Options for requesting an Item Check from an Actor.
 * @typedef {CheckOptions} ItemCheckOptions
 * @property {boolean} [automaticFailure] - Whether the check fails automatically; its dice still roll.
 * @property {boolean} [doubleExpertise] - Whether to double the Expertise applied.
 * @property {boolean} [doubleTraining] - Whether to double the Training applied.
 * @property {boolean} [extraFailureOnCritical] - Whether a roll of 1 equals a negative success.
 * @property {boolean} [extraSuccessOnCritical] - Whether a roll of 6 equals an extra success.
 * @property {number} [advantage] - The summed Advantage (+) and Disadvantage (-) from always-on sources and the dialog.
 * @property {number} [checkIdx] - The index of the item's Check being rolled.
 * @property {number} [complexity] - The minimum number of Successes needed to succeed at the Check.
 * @property {number} [damageMod] - Modifier for the amount of Damage to be inflicted.
 * @property {number} [diceMod] - Modifier for the number of Dice being rolled.
 * @property {number} [difficulty] - The Difficulty before Advantage.
 * @property {number} [expertiseMod] - Modifier for the amount of Expertise to be applied.
 * @property {number} [healingMod] - Modifier for the amount of Healing to be applied.
 * @property {number} [resolveCost] - The Resolve Cost for performing the check, if any.
 * @property {number} [trainingMod] - Modifier for the amount of Training to be applied.
 * @property {string} [attribute] - The Attribute to use for the Check.
 * @property {string} [effectId] - The ID of the Actor's applicable effect whose check is rolled, read live.
 * @property {string} [itemId] - The ID of the owned item whose check is rolled, read live.
 * @property {object} [itemRollData] - Roll data for the check, used only when neither an item nor an effect ID is set.
 * @property {string} [skill] - The Skill to use for the Check.
 * @property {string[]} [situations] - The camel-case keys of the situational modifiers ticked in the check dialog.
 */

/**
 * Creates an Item Check Options object, based off the provided input. Complexity and Difficulty stay `undefined`
 * when not supplied, so `initializeItemCheckOptions` reads them from the item's check while a supplied 0 is kept.
 * @param {object} options - Object containing the initial options.
 * @returns {ItemCheckOptions} The new Item Check Options, with every other unset field at its default.
 */
export default function createItemCheckOptions(options) {
   return {
      advantage: options.advantage ?? 0,
      attribute: options.attribute ?? 'default',
      automaticFailure: options.automaticFailure ?? false,
      checkIdx: options.checkIdx ?? 0,
      complexity: options.complexity,
      damageMod: options.damageMod ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty,
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      effectId: options.effectId ?? '',
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      healingMod: options.healingMod ?? 0,
      itemId: options.itemId ?? '',
      itemRollData: options.itemRollData,
      resolveCost: options.resolveCost ?? 0,
      situations: options.situations ?? [],
      skill: options.skill ?? 'default',
      trainingMod: options.trainingMod ?? 0,
   };
}
