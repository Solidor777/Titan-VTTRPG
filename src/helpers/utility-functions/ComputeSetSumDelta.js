/**
 * Computes the corrective delta a setSum rules element must add to a stat's mod bucket so the stat's
 * running total is forced to (set), floored to (min), or capped at (max) the supplied value.
 * @param {number} total - The stat's running total (base value plus all accumulated modifiers).
 * @param {number} value - The target total value.
 * @param {string} mode - 'set' (force exact), 'min' (raise to at least value), or 'max' (cap at value).
 * Any other value is treated as 'set'.
 * @returns {number} The delta to add to the stat's mod bucket (newTotal - total).
 */
export default function computeSetSumDelta(total, value, mode) {
   let newTotal;
   switch (mode) {
      case 'min': {
         newTotal = Math.max(total, value);
         break;
      }
      case 'max': {
         newTotal = Math.min(total, value);
         break;
      }
      default: {
         newTotal = value;
         break;
      }
   }

   return newTotal - total;
}
