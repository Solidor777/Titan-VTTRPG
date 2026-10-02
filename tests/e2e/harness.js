import { expect, test as base } from '@playwright/test';
import { flushPageErrors, takeUncheckedErrors, trackWorldPage } from './join.js';

export { expect, flushPageErrors, trackWorldPage };

/**
 * The e2e `test`: Playwright's, with two automatic gates that fail on any error a world page collected. After each
 * test (its `afterEach` hooks included), the test fails on the errors collected since the previous check, on every
 * page that joined the world (`join.js` `joinWorld`), including second clients that have closed since. Errors
 * raised in a `beforeAll` after the boot therefore fail the file's first test; errors raised in an `afterAll` fail the
 * next test of the worker, and those after the worker's last test fail its teardown. Every spec imports `test` from
 * here.
 * @type {typeof base}
 */
export const test = base.extend({
   worldPageErrorGate: [
      /**
       * Runs after each test and its `afterEach` hooks, and fails the test on the errors collected on any world page
       * since the previous check.
       * @param {object} fixtures - The fixtures this one requests (none).
       * @param {() => Promise<void>} use - Runs the test; the gate runs once it resolves.
       * @returns {Promise<void>} Resolves once the check passed.
       */
      async ({}, use) => {
         await use();

         /** @type {string[]} The errors collected during the test. */
         const lines = await takeUncheckedErrors();
         expect(lines, `errors collected on a world page during the test:\n${lines.join('\n')}`).toEqual([]);
      },
      { auto: true },
   ],
   workerWorldPageErrorGate: [
      /**
       * Runs once after the worker's last test, and fails the run on the errors collected on any world page since the
       * last check.
       * @param {object} fixtures - The fixtures this one requests (none).
       * @param {() => Promise<void>} use - Runs the worker's tests; the gate runs once it resolves.
       * @returns {Promise<void>} Resolves once the check passed.
       */
      async ({}, use) => {
         await use();

         /** @type {string[]} The errors collected after the worker's last test check. */
         const lines = await takeUncheckedErrors();
         expect(lines, `errors collected on a world page after the last test:\n${lines.join('\n')}`).toEqual([]);
      },
      {
         scope: 'worker',
         auto: true,
      },
   ],
});
