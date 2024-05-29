/**
 * Options for requesting an Attack Check from an Actor.
 * @typedef {object} AttackCheckOptions
 * @property {boolean?} cleave Whether this Attack is a Cleave attack.
 * @property {boolean?} doubleExpertise Whether to double the Expertise applied..
 * @property {boolean?} doubleTraining Whether to double the Training applied.
 * @property {boolean?} extraFailureOnCritical Whether a roll of 1 equals a negative success.
 * @property {boolean?} extraSuccessOnCritical Whether a roll of 6 equals an extra success.
 * @property {boolean?} flurry Whether this Attack is a Flurry attack.
 * @property {boolean?} ineffective Whether this Attack is an Ineffective attack.
 * @property {boolean?} magical Whether this Attack is a Magical attack.
 * @property {boolean?} multiAttack Whether this Attack is a Multi-Attack.
 * @property {boolean?} penetrating Whether this Attack is a Penetrating attack.
 * @property {boolean?} plusExtraSuccessDamage Whether to increase the damage for each extra success.
 * @property {boolean?} rend Whether this check is a Rend attack.
 * @property {number?} attackIdx The index of the weapon's Attack being rolled.
 * @property {number?} attackerAccuracy The Accuracy rating of the attacker.
 * @property {number?} attackerMelee The Melee rating of the attacker.
 * @property {number?} damageMod Modifier for the amount of Damage to be inflicted.
 * @property {number?} diceMod Modifier for the number of Dice being rolled.
 * @property {number?} expertiseMod Modifier for the amount of Expertise to be applied.
 * @property {number?} range The Range of the Attack.
 * @property {number?} targetDefense The Defense rating of the target actor.
 * @property {number?} trainingMod Modifier for the amount of Training to be applied.
 * @property {string?} attribute The Attribute to use for the Check.
 * @property {string} itemId The the ID of the weapon being used for the attack.
 * @property {string?} skill The Skill to use for the Check.
 * @property {string?} type The Type of Attack being performed (Melee or Ranged).
 * @augments CheckOptions
 */

/**
 * Creates an Attack Check Options object, based off the provided input.
 * @param {object} options - Object containing the initial options.
 * @returns {AttackCheckOptions} The new, fully-populated Attack Check Options.
 */
export default function createAttackCheckOptions(options) {
   return {
      attackIdx: options.attackIdx ?? 0,
      attackerAccuracy: options.attackerAccuracy,
      attackerMelee: options.attackerMelee,
      attribute: options.attribute ?? 'default',
      cleave: options.cleave ?? false,
      diceMod: options.diceMod ?? 0,
      doubleExpertise: options.doubleExpertise ?? false,
      doubleTraining: options.doubleTraining ?? false,
      expertiseMod: options.expertiseMod ?? 0,
      extraFailureOnCritical: options.extraFailureOnCritical ?? false,
      extraSuccessOnCritical: options.extraSuccessOnCritical ?? false,
      flurry: options.flurry ?? false,
      ineffective: options.ineffective ?? false,
      itemId: options.itemId,
      magical: options.magical ?? false,
      multiAttack: options.multiAttack ?? false,
      penetrating: options.penetrating ?? false,
      plusExtraSuccessDamage: options.plusExtraSuccessDamage ?? true,
      range: options.range ?? 1,
      rend: options.rend ?? false,
      skill: options.skill ?? 'default',
      targetDefense: options.targetDefense ?? 0,
      trainingMod: options.trainingMod ?? 0,
      type: options.type ?? 'melee',
   };
}
