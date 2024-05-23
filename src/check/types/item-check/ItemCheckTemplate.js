import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';
import localize from '~/helpers/utility-functions/Localize.js';

/**
 * Base data for an Opposed Check.
 * @typedef {object} OpposedCheckBase
 * @property {boolean} enabled Whether the opposed check is enabled for the owning check.
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} skill The Skill to use for the Check.
 */

/**
 * Object for storing an Item Check.
 * @typedef {object} ItemCheckTemplate
 * @property {OpposedCheckBase} opposedCheck The check that can be used to oppose this check, if any.
 * @property {boolean} isDamage Whether the check inflicts damage.
 * @property {boolean} isHealing Whether the check heals damage.
 * @property {boolean} scaling Whether subsequent successes should scale the initial value.
 * @property {number} complexity The minimum number of Successes needed.
 * @property {number} difficulty The minimum roll on a die to achieve a Success.
 * @property {number} initialValue The initial value of the Healing or Damage, if applicable.
 * @property {number} resolveCost The resolve cost for performing the check, if any.
 * @property {string} attribute The Attribute to use for the Check.
 * @property {string} damageReducedBy What opposed check that can reduce this damage, if any.
 * @property {string} label The display name of the check.
 * @property {string} resistanceCheck The Resistance that can be used to oppose this check.
 * @property {string} skill The Skill to use for the Check.
 * @property {string} uuid Generated unique identifier for the Check.
 * @augments   {object}
 */

/**
 * Creates a new object for storing an Item Check.
 * @returns {ItemCheckTemplate} The new Item Check Template with the default options.
 */
export default function createItemCheckTemplate() {
   return {
      attribute: 'body',
      complexity: 1,
      damageReducedBy: 'none',
      difficulty: 4,
      initialValue: 1,
      isDamage: false,
      isHealing: false,
      label: localize('check'),
      opposedCheck: {
         attribute: 'body',
         enabled: false,
         skill: 'athletics',
      },
      resistanceCheck: 'none',
      resolveCost: 0,
      scaling: true,
      skill: 'arcana',
      uuid: generateUUID(),
   };
}
