/**
 * Independent oracle for TITAN check results, used by the E2E checks-integration tests.
 *
 * This is a deliberate, standalone reimplementation of the success/crit rules in
 * `src/check/CheckResults.js`; it is NOT imported from the engine, so it can catch an engine
 * regression rather than mirror one. It assumes no expertise was applied (each face is final),
 * which the integration fixture guarantees via `totalExpertise === 0`.
 */

/**
 * Computes the expected check results for a set of final die faces.
 * @param {number[]} faces - The final d6 faces (post-expertise; equal to base when expertise is 0).
 * @param {object} params - The check parameters.
 * @param {number} params.difficulty - The minimum face for a normal success.
 * @param {number} params.complexity - The successes required to succeed (0 means "never succeeded").
 * @param {boolean} [params.extraSuccessOnCritical] - Whether a 6 yields two successes.
 * @param {boolean} [params.extraFailureOnCritical] - Whether a 1 subtracts a success.
 * @returns {{ successes: number, criticalSuccesses: number, criticalFailures: number,
 *   succeeded: boolean, extraSuccesses: number, expertiseRemaining: number }} The expected results.
 */
export function expectedCheckResults(faces, params) {
   // The running tallies mirrored from the engine's per-die classification.
   let successes = 0;
   let criticalSuccesses = 0;
   let criticalFailures = 0;

   // Classify each die exactly once: crit success, normal success, or crit failure.
   for (const face of faces) {
      if (face === 6) {
         criticalSuccesses += 1;
         successes += params.extraSuccessOnCritical ? 2 : 1;
      }
      else if (face >= params.difficulty) {
         successes += 1;
      }
      else if (face === 1) {
         criticalFailures += 1;
         if (params.extraFailureOnCritical) {
            successes -= 1;
         }
      }
   }

   // Resolve success state against complexity (a complexity of 0 can never succeed, per the engine).
   let succeeded = false;
   let extraSuccesses = 0;
   if (params.complexity > 0 && successes >= params.complexity) {
      succeeded = true;
      if (successes > params.complexity) {
         extraSuccesses = successes - params.complexity;
      }
   }

   return {
      successes: successes,
      criticalSuccesses: criticalSuccesses,
      criticalFailures: criticalFailures,
      succeeded: succeeded,
      extraSuccesses: extraSuccesses,
      expertiseRemaining: 0,
   };
}
