/**
 * Options that change how much Damage a target's Armor resists.
 * @typedef {object} DamageResistanceOptions
 * @property {boolean} [ignoreArmor] - Whether the Damage ignores all Armor.
 * @property {boolean} [ineffective] - Whether the attack is Ineffective (Armor counts double).
 * @property {boolean} [penetrating] - Whether the attack is Penetrating (ignores ½ of the Armor).
 */

/**
 * Computes how much Damage a target's Armor resists. Ignore Armor resists nothing. Ineffective doubles the Armor, then
 * Penetrating ignores ½ of it; the rules give Penetrating no rounding, so the remaining Armor rounds up, as the rules'
 * other halvings do (a Penetrating attack against Armor 1 is still resisted by 1).
 * @param {number} armor - The target's Armor value.
 * @param {DamageResistanceOptions} [options] - Options for the Damage being applied.
 * @returns {number} The Damage the Armor resists, never below 0.
 */
export default function computeDamageResistance(armor, options) {
   if (options?.ignoreArmor || armor <= 0) {
      return 0;
   }

   /** @type {number} The Armor after the attack's traits. */
   let resistance = options?.ineffective ? armor * 2 : armor;
   if (options?.penetrating) {
      resistance = Math.ceil(resistance / 2);
   }

   return resistance;
}
