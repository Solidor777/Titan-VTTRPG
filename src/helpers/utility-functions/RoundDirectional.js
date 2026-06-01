/**
 * Rounds a number in an explicit direction. Used by multiplicative rules elements where TITAN always
 * rounds either up or down (never to nearest).
 * @param {number} value - The number to round.
 * @param {string} rounding - The rounding direction: 'up' (ceil) or 'down' (floor). Any other value
 * (including undefined) is treated as 'down'.
 * @returns {number} The rounded number.
 */
export default function roundDirectional(value, rounding) {
   return rounding === 'up' ? Math.ceil(value) : Math.floor(value);
}
