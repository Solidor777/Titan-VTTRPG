/**
 * The rounding directions a multiplicative rules element (`mulBase`, `mulSum`) offers, in editor display order. The
 * single source for both editors' rounding select; `roundDirectional` implements each. `down` is first because an
 * element with no stored `rounding` rounds down, and the Select writes (and its Document wrapper persists) its first
 * option when the bound value is not listed, so opening an editor never changes what the engine applies.
 * @type {readonly string[]}
 */
export const ROUNDING_DIRECTIONS = Object.freeze([
   'down',
   'up',
   'nearest',
]);

/**
 * Rounds a number in an explicit direction for the multiplicative rules elements. `nearest` rounds a half toward
 * positive infinity (`Math.round`). Every direction commutes with adding an integer, so rounding a `mulBase` element's
 * contribution rounds the stat's resulting value the same way, as the rules phrase it ("rounded up").
 * @param {number} value - The number to round.
 * @param {string} [rounding] - The direction: 'up' (ceil), 'down' (floor), or 'nearest' (round). Any other value,
 * including undefined, rounds down.
 * @returns {number} The rounded number.
 */
export default function roundDirectional(value, rounding) {
   switch (rounding) {
      case 'up': {
         return Math.ceil(value);
      }
      case 'nearest': {
         return Math.round(value);
      }
      default: {
         return Math.floor(value);
      }
   }
}
