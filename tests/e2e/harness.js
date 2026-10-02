import { expect, test as base } from '@playwright/test';
import { flushHookErrorReports } from './world.js';

export { expect };

/**
 * @typedef {object} WorldPage
 * @property {import('@playwright/test').Page} page - A page that joined the world.
 * @property {string} user - The user it joined as.
 * @property {string} origin - What joined it: the spec file that logged it in, or the tool's name.
 * @property {string[]} errors - Every uncaught page error and hook error the page collected since it joined.
 * @property {number} checked - How many of `errors` a check has already consumed.
 */

/** @type {WorldPage[]} The pages that joined the world in this process and still have errors to check. */
const WORLD_PAGES = [];

/**
 * Records a page that is joining the world, so the gates of `test` check its collected errors.
 * @param {import('@playwright/test').Page} page - The page, before its first navigation.
 * @param {string} user - The user it joins as.
 * @param {string} origin - What joins it, named when a gate reports its errors.
 * @param {string[]} errors - The page's collector (`attachPageErrors`), attached before its first navigation.
 * @returns {WorldPage} The page's record.
 */
export function trackWorldPage(page, user, origin, errors) {
   /** @type {WorldPage} The page's record. */
   const record = {
      page,
      user,
      origin,
      errors,
      checked: 0,
   };
   WORLD_PAGES.push(record);
   return record;
}

/**
 * Makes the page's collected errors current for a check: waits for every hook error the open page reported to be
 * delivered (`flushHookErrorReports`, whose page round trip also follows any uncaught page error raised before it).
 * A closed page cannot be read, so its errors are those already delivered.
 * @param {import('@playwright/test').Page} page - A page that joined the world.
 * @returns {Promise<void>} Resolves once the page's delivered errors are current.
 */
export async function flushPageErrors(page) {
   if (!page.isClosed()) {
      await flushHookErrorReports(page);
   }
}

/**
 * Takes the errors every world page collected since its last check, and forgets the closed pages.
 * @returns {Promise<string[]>} One line per error: the user, what joined the page, and the message.
 */
async function takeUncheckedErrors() {
   /** @type {string[]} The unchecked errors, labelled. */
   const lines = [];
   for (const record of [...WORLD_PAGES]) {
      await flushPageErrors(record.page);
      for (const message of record.errors.slice(record.checked)) {
         lines.push(`${record.user} (logged in by ${record.origin}): ${message}`);
      }
      record.checked = record.errors.length;
      if (record.page.isClosed()) {
         WORLD_PAGES.splice(WORLD_PAGES.indexOf(record), 1);
      }
   }
   return lines;
}

/**
 * The e2e `test`: Playwright's, with two automatic gates that fail on any error a world page collected. After each
 * test (its `afterEach` hooks included), the test fails on the errors collected since the previous check, on every
 * page that joined the world (`fixtures.js` `joinWorld`), including second clients that have closed since. Errors
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
