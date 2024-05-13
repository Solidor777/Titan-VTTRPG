/**
 * Calculated parameters for the creation of a new Attack Check, based off an Actor's data.
 * @typedef {object} AttackCheckParameters
 * @augments CheckParameters
 * @property {boolean}           cleave                  Whether this check is a Cleave attack
 * @property {boolean}           doubleExpertise         Whether to double the Expertise to apply..
 * @property {boolean}           doubleTraining          Whether to double the Training to apply.
 * @property {boolean}           extraFailureOnCritical  Whether a roll of 1 equals a negative success.
 * @property {boolean}           extraSuccessOnCritical  Whether a roll of 6 equals an extra success.
 * @property {boolean}           flurry                  Whether this Attack is a Flurry attack.
 * @property {boolean}           ineffective             Whether this Attack is an Ineffective attack.
 * @property {boolean}           magical                 Whether this Attack is a Magical attack.
 * @property {boolean}           multiAttack             Whether this Attack is a Multi-Attack.
 * @property {boolean}           penetrating             Whether this Attack is a Penetrating attack
 * @property {boolean}           plusExtraSuccessDamage  Whether to increase the damage for each extra success.
 * @property {boolean}           rend                    Whether this check is a Rend attack.
 * @property {integer}           targetDefense           The Defense rating of the target actor.
 * @property {integer}           damage                  The minimum Damage to apply on a successful check.
 * @property {integer}           attackerRating          The attacker's rating used for the attack.
 * @property {integer}           attackerAccuracy        The attacker's accuracy rating.
 * @property {integer}           attackerMelee           The attacker's melee rating.
 * @property {integer}           attributeDice           The number of dice granted by the attribute.
 * @property {integer}           complexity              The minimum number of Successes needed.
 * @property {integer}           damageMod               Modifier for the amount of Damage to be inflicted.
 * @property {integer}           diceMod                 Modifier for the number of Dice being rolled.
 * @property {integer}           difficulty              The minimum roll on a die to achieve a Success.
 * @property {integer}           expertiseMod            Modifier for the amount of Expertise to be applied.
 * @property {integer}           range                   The Range of the Attack.
 * @property {integer}           skillExpertise          The amount of expertise granted by the skill.
 * @property {integer}           skillTrainingDice       The number of dice granted by the skill.
 * @property {integer}           totalDice               The total number of dice to be rolled.
 * @property {integer}           totalExpertise          The total amount of expertise to apply.
 * @property {integer}           totalTrainingDice       The total number of training dice to be rolled.
 * @property {integer}           trainingMod             Modifier for the amount of Training to be applied.
 * @property {string}            attackNotes             Messages to that are specific to this attack, if any.
 * @property {string[]}          attackTrait             Array of standard attack traits applied to this attack.
 * @property {string[]}          customTrait             Array of custom traits applied to this attack.
 * @property {string}            attackName              The display name of the attack.
 * @property {string}            attribute               The Attribute to use for the Check.
 * @property {string}            img                     The image to display with the check.
 * @property {string}            itemName                The name of the item being rolled.
 * @property {string}            skill                   The Skill to use for the Check.
 * @property {string}            type                    The Type of Attack being performed (Melee or Ranged).
 */

/**
 * Creates an Attribute Check Parameters object, based off the provided input.
 * @param   {AttackCheckOptions}    options  Fully populated Attack Check Options.
 * @returns {AttackCheckParameters}          The new Attack Check Parameters.
 */
export default function createAttackCheckParameters(options) {
   return {
      attackNotes: '',
      attackerAccuracy: options.attackerAccuracy,
      attackerMelee: options.attackerMelee,
      attackName: '',
      attackerRating: 0,
      attackTrait: [],
      attribute: options.attribute,
      attributeDice: 0,
      cleave: options.cleave,
      complexity: 1,
      customTrait: [],
      damage: 0,
      damageMod: options.damageMod,
      diceMod: options.diceMod,
      difficulty: 4,
      doubleExpertise: options.doubleExpertise,
      doubleTraining: options.doubleTraining,
      expertiseMod: options.expertiseMod,
      extraFailureOnCritical: options.extraFailureOnCritical,
      extraSuccessOnCritical: options.extraSuccessOnCritical,
      flurry: options.flurry,
      img: '',
      ineffective: options.ineffective,
      itemName: '',
      magical: options.magical,
      multiAttack: options.multiAttack,
      penetrating: options.penetrating,
      plusExtraSuccessDamage: options.plusExtraSuccessDamage,
      range: options.range,
      rend: options.rend,
      skill: options.skill,
      skillExpertise: 0,
      skillTrainingDice: 0,
      targetDefense: options.targetDefense,
      totalDice: 0,
      totalExpertise: 0,
      totalTrainingDice: 0,
      trainingMod: options.trainingMod,
      type: options.type,
   };
}
