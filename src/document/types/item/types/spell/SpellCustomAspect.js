import localize from '~/helpers/utility-functions/Localize.js';
import generateUUID from '~/helpers/utility-functions/GenerateUUID.js';

/**
 * An object storing the data for a Spell Custom Aspect.
 * @typedef {object} SpellCustomAspect
 * @property {string}   label             The display name of the Aspect.
 * @property {boolean}  scaling           Whether the effect of the Aspect increases with extra successes.
 * @property {integer}   initialValue      The initial value of the Aspect's effects when successfully cast.
 * @property {integer}   cost              The Aspect Cost for determine Difficulty and Complexity.
 * @property {string}   resistanceCheck   A Resistance that can be used to resist the effects of the aspect.
 * @property {boolean}  isDamage          Whether the Aspect inflicts Damage.
 * @property {boolean}  isHealing         Whether the Aspect Heals Damage.
 * @property {string}   uuid              Generated unique identifier for the Aspect.
 */

/**
 * Creates a new Weapon Attack.
 * @returns {SpellCustomAspect} The Weapon Attack with the default options sat.
 */

export default function createCustomAspectTemplate() {
   return {
      label: localize('customAspect'),
      scaling: true,
      initialValue: 1,
      cost: 1,
      resistanceCheck: 'none',
      isDamage: false,
      isHealing: false,
      uuid: generateUUID(),
   };
}
