/**
 * Clamps a value between a minimum and a maximum number.
 * @param {number} value - The value being clamped.
 * @param {number} min - The minimum value.
 * @param {number} max - The maximum value.
 * @returns {number} The number if it lies between the min and max.
 * Otherwise, the min, or the max, depending on whether
 * the value was greater than the max,
 * or lesser than the min.
 */
export default function clamp(value, min, max) {
   return max > min ? Math.min(Math.max(value, min), max) :
      Math.min(Math.max(value, max), min);
}
