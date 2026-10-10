/**
 * Computes the Damage applied by an Apply Half Damage button: half of the Damage rounded down, never less than 1 for
 * Damage above 0. Every chat card with damage buttons uses this function so the half-damage rule is the same on all of
 * them.
 * @param {number} damage - The Damage of the card.
 * @returns {number} The half Damage, or 0 when the card has no Damage.
 */
export default function computeHalfDamage(damage) {
   if (!(damage > 0)) {
      return 0;
   }

   return Math.max(Math.floor(damage / 2), 1);
}
