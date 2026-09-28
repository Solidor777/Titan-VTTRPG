import clamp from '~/helpers/utility-functions/Clamp.js';

/**
 * The strongest Advantage or Disadvantage a check can have: two or more sources make it Greater (±2), never more.
 * Source: TITAN Rules Compendium (09_26_2026), lines 1737-1759.
 * @type {number}
 */
export const MAX_ADVANTAGE_LEVEL = 2;

/**
 * The five Advantage levels a check dialog offers, from Greater Disadvantage to Greater Advantage. Labels are
 * localization keys.
 * @type {ReadonlyArray<{value: number, label: string}>}
 */
export const ADVANTAGE_LEVEL_OPTIONS = Object.freeze([
   {
      value: -2,
      label: 'greaterDisadvantage',
   },
   {
      value: -1,
      label: 'disadvantage',
   },
   {
      value: 0,
      label: 'noAdvantage',
   },
   {
      value: 1,
      label: 'advantage',
   },
   {
      value: 2,
      label: 'greaterAdvantage',
   },
]);

/**
 * The four levels an `advantage` rules element stores: every dialog level except none.
 * @type {ReadonlyArray<{value: number, label: string}>}
 */
export const ADVANTAGE_ELEMENT_LEVEL_OPTIONS = Object.freeze(
   ADVANTAGE_LEVEL_OPTIONS.filter((option) => option.value !== 0),
);

/**
 * Clamps a summed Advantage to the levels the rules allow, Greater Disadvantage to Greater Advantage.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {number} The applied level, from -2 to 2.
 */
export function clampAdvantage(advantage) {
   return clamp(advantage, -MAX_ADVANTAGE_LEVEL, MAX_ADVANTAGE_LEVEL);
}

/**
 * Gets the localization key naming a summed Advantage's applied level.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {string} The key of the clamped level's label (`noAdvantage` for 0).
 */
export function getAdvantageLabel(advantage) {
   /** @type {number} The applied level. */
   const level = clampAdvantage(advantage);
   return ADVANTAGE_LEVEL_OPTIONS.find((option) => option.value === level).label;
}

/**
 * Applies a summed Advantage to a check's Difficulty. Advantage lowers the Difficulty by its level to a minimum of 2;
 * Disadvantage raises it by its level to a maximum of 6; the two cancel through the sum. A Difficulty already past the
 * bound in the direction of the change is left unchanged, so Advantage never raises a Difficulty and Disadvantage never
 * lowers one. Source: TITAN Rules Compendium (09_26_2026), lines 1737-1759.
 * @param {number} difficulty - The Difficulty before Advantage.
 * @param {number} advantage - The sum of every Advantage (+) and Disadvantage (-) source.
 * @returns {number} The Difficulty after Advantage.
 */
export default function applyAdvantage(difficulty, advantage) {
   /** @type {number} The applied level, capped at Greater. */
   const net = clampAdvantage(advantage);

   // Advantage lowers the Difficulty toward 2.
   if (net > 0) {
      return difficulty < 2 ? difficulty : Math.max(2, difficulty - net);
   }

   // Disadvantage raises the Difficulty toward 6.
   if (net < 0) {
      return difficulty > 6 ? difficulty : Math.min(6, difficulty - net);
   }

   return difficulty;
}
