/**
 * Options for requesting an Item Check from an Actor.
 * @typedef {object} ItemCheckOptions
 * @augments CheckOptions
 * @property {boolean?} doubleExpertise         Whether to double the Expertise to apply..
 * @property {boolean?} doubleTraining          Whether to double the Training to apply.
 * @property {boolean?} extraFailureOnCritical  Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical  Whether a roll of 6 equals an extra success.
 * @property {number?}  checkIdx                The index of the item's Check being rolled.
 * @property {number?}  complexity              The minimum number of Successes needed.
 * @property {number?}  damageMod               Modifier for the amount of Damage to be inflicted.
 * @property {number?}  diceMod                 Modifier for the number of Dice being rolled.
 * @property {number?}  difficulty              The minimum roll on a die to achieve a Success.
 * @property {number?}  expertiseMod            Modifier for the amount of Expertise to be applied.
 * @property {number?}  healingMod              Modifier for the amount of Healing to be applied.
 * @property {number?}  resolveCost             The Resolve Cost for performing the check, if any.
 * @property {number?}  trainingMod             Modifier for the amount of Training to be applied.
 * @property {string?}  attribute               The Attribute to use for the Check.
 * @property {string}   itemId                  The the ID of the item being used for the check.
 * @property {string?}  skill                   The Skill to use for the Check.
 */

/**
 * Creates a Casting Check Options object, based off the provided input.
 * @param   {object}             options  Object containing the initial options.
 * @returns {ItemCheckOptions}            The new, fully-populated Item Check Options.
 */
export default function createItemCheckOptions(options) {
   return {
      attribute: options.attribute ?? 'default',
      checkIdx: options.checkIdx ?? 0,
      complexity: options.doubleExpertise ?? 1,
      damageMod: options.damageMod ?? 0,
      diceMod: options.diceMod ?? 0,
      difficulty: options.difficulty ?? 0,
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraSuccessOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      healingMod: options.healingMod ?? 0,
      itemId: options.itemId ?? '',
      resolveCost: options.resolveCost ?? 0,
      skill: options.skill ?? 'default',
      trainingMod: options.trainingMod ?? 0,
   };
}
