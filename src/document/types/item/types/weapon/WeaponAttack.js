import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * An object storing the data for a Weapon Attack.
 * @typedef {object} WeaponAttack
 * @property {string} label The display name of the Attack.
 * @property {string} type The Type of Attack being performed (Melee or Ranged).
 * @property {number} range The Range of the Attack.
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} skill The Skill to use for the Check.
 * @property {number} damage The minimum damage a successful attack will inflict.
 * @property {boolean} plusExtraSuccessDamage Whether to increase the damage for each extra success.
 * @property {AttackTrait[]} trait Array of standard attack traits applied to this Attack.
 * @property {string[]} customTrait Array of custom traits applied to this Attack.
 * @property {string} uuid Generated unique identifier for the Attack.
 */

/**
 * Creates a new Weapon Attack.
 * @returns {WeaponAttack} The Weapon Attack with the default options sat.
 */
export default function createWeaponAttackTemplate() {
   return {
      attribute: 'body',
      customTrait: [],
      damage: 1,
      label: localize('attack'),
      plusExtraSuccessDamage: true,
      range: 1,
      skill: 'meleeWeapons',
      trait: [],
      type: 'melee',
      uuid: generateUUID(),
   };
}
