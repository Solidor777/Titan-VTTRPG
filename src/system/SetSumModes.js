/** @type {string} The `setSum` mode that forces a stat's total to the element's value. */
export const SET_SUM_MODE_SET = 'set';

/** @type {string} The `setSum` mode that raises a stat's total to at least the element's value. */
export const SET_SUM_MODE_MIN = 'min';

/** @type {string} The `setSum` mode that caps a stat's total at the element's value. */
export const SET_SUM_MODE_MAX = 'max';

/**
 * Each `setSum` mode's rule for the total it leaves a stat with, given the stat's running total and the element's
 * value. The mode list below is the keys of this table, so a mode cannot be offered without a rule or ruled without
 * being offered.
 * @type {Readonly<Record<string, function(number, number): number>>}
 */
const SET_SUM_MODE_TARGETS = Object.freeze({
   [SET_SUM_MODE_SET]: (total, value) => value,
   [SET_SUM_MODE_MIN]: (total, value) => Math.max(total, value),
   [SET_SUM_MODE_MAX]: (total, value) => Math.min(total, value),
});

/**
 * Every `setSum` mode, in the order the rules element editor offers them.
 * @type {readonly string[]}
 */
export const SET_SUM_MODES = Object.freeze(Object.keys(SET_SUM_MODE_TARGETS));

/**
 * Computes the total a `setSum` element leaves a stat with.
 * @param {number} total - The stat's running total.
 * @param {number} value - The element's target value.
 * @param {string} [mode] - One of SET_SUM_MODES; any other value is treated as SET_SUM_MODE_SET.
 * @returns {number} The stat's new total.
 */
export function getSetSumTarget(total, value, mode) {
   const target = Object.hasOwn(SET_SUM_MODE_TARGETS, mode)
      ? SET_SUM_MODE_TARGETS[mode]
      : SET_SUM_MODE_TARGETS[SET_SUM_MODE_SET];
   return target(total, value);
}
