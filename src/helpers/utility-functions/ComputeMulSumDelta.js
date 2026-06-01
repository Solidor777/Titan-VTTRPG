import roundDirectional from '~/helpers/utility-functions/RoundDirectional.js';

/**
 * Computes the corrective delta a mulSum rules element must add to a stat's mod bucket so the stat's
 * running total is multiplied and rounded. Returns 0 for non-positive totals so an already-zero stat
 * is never pushed negative.
 * @param {number} total - The stat's running total (base value plus all accumulated modifiers).
 * @param {number} value - The fractional multiplier (e.g. 0.5 to halve).
 * @param {string} [rounding] - The rounding direction applied to the scaled total ('up' or 'down').
 * @returns {number} The delta to add to the stat's mod bucket (newTotal - total), or 0 if total <= 0.
 */
export default function computeMulSumDelta(total, value, rounding) {
   if (total <= 0) {
      return 0;
   }
   const newTotal = roundDirectional(total * value, rounding);

   return newTotal - total;
}
