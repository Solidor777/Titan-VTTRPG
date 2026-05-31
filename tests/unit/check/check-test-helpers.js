/**
 * Builds a CheckDiceResults object from an array of final die face values.
 * @param {number[]} finals - The final face values (post-expertise) for each die.
 * @param {number} [expertiseRemaining] - The expertise remaining to carry through.
 * @returns {{ dice: object[], expertiseRemaining: number }} A CheckDiceResults for the result calculators.
 */
export function diceResults(finals, expertiseRemaining = 0) {
   return {
      dice: finals.map((final) => ({ base: final, expertiseApplied: 0, final: final })),
      expertiseRemaining: expertiseRemaining,
   };
}

/**
 * Builds a raw CheckDie array from an array of face values, for `_applyExpertise`.
 * @param {number[]} finals - The face values; `base` and `final` are seeded equal.
 * @returns {object[]} An array of `{ base, expertiseApplied, final }`.
 */
export function dice(finals) {
   return finals.map((final) => ({ base: final, expertiseApplied: 0, final: final }));
}

/**
 * Independent oracle for the success count, mirroring the engine's if/else-if structure.
 * @param {number[]} finals - The final die faces.
 * @param {object} params - `{ difficulty, extraSuccessOnCritical, extraFailureOnCritical }`.
 * @returns {number} The expected number of successes.
 */
export function expectedSuccesses(finals, params) {
   let successes = 0;
   for (const final of finals) {
      if (final === 6) {
         successes += params.extraSuccessOnCritical ? 2 : 1;
      } else if (final >= params.difficulty) {
         successes += 1;
      } else if (final === 1 && params.extraFailureOnCritical) {
         successes -= 1;
      }
   }
   return successes;
}
