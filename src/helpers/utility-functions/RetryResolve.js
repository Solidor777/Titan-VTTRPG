import delay from '~/helpers/utility-functions/Delay.js';

/**
 * Repeatedly invokes a synchronous resolver until it returns a truthy value or the attempt budget is
 * exhausted, yielding for a fixed delay between attempts. The first attempt runs immediately with no
 * delay, so the success path pays no wall-clock cost.
 * @param {() => *} resolveFn - Synchronous resolver; returns a truthy result on success, or a falsy value
 * to trigger a retry.
 * @param {object} [options] - The retry budget.
 * @param {number} [options.attempts] - Maximum number of resolver invocations.
 * @param {number} [options.delayMs] - Milliseconds to wait between attempts.
 * @returns {Promise<*|null>} The first truthy resolver result, or null if the budget is exhausted without
 * one.
 */
export default async function retryResolve(resolveFn, { attempts = 5, delayMs = 50 } = {}) {
   for (let i = 0; i < attempts; i++) {
      // The current resolution attempt's result.
      const result = resolveFn();
      if (result) {
         return result;
      }

      // Yield before the next attempt, but never after the final one.
      if (i < attempts - 1) {
         await delay(delayMs);
      }
   }

   return null;
}
