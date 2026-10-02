import { installPoll } from './poll.js';
import { attachPageErrors, flushHookErrorReports, installHookErrorReporting } from './world.js';

// The world-joining module: it holds what every logged-in page needs and nothing that depends on the test runner, so
// the setup, the teardown and the census tool can log in without loading `harness.js` (whose `test` extends
// Playwright's) or any flow.

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
export async function takeUncheckedErrors() {
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
 * Joins the live world as a user and returns the errors its boot raised, without asserting them.
 *
 * Verified selectors against the running v14 join page:
 * `select[name="userid"]` is the user picker (options labelled by user name);
 * `input[name="password"]` is the optional user password field;
 * `button[name="join"]` is the "Join Game Session" submit button.
 *
 * Before navigating, the page gets the in-page poll helper, hook-error reporting, and a collector (`attachPageErrors`)
 * that the gates of `harness.js` `test` check, so the page collects from its first document onward. Core sets
 * `game.ready` and calls the `ready` hook synchronously (`client/game.mjs:777-779`), so the boot's errors are read
 * after every synchronous `init`, `setup` and `ready` listener has run. They are marked checked, so the gates do not
 * report them again.
 * @param {import('@playwright/test').Page} page - A page that has not navigated yet.
 * @param {string} user - The display name of the Foundry user to join as.
 * @param {string} origin - What joined the page, named when a gate reports its errors.
 * @returns {Promise<string[]>} The uncaught page errors and hook errors raised from the join screen until ready.
 */
export async function joinWorld(page, user, origin) {
   // Install the in-page poll helper and hook-error reporting before navigating (addInitScript runs on document
   // load).
   await installPoll(page);
   await installHookErrorReporting(page);

   /** @type {import('./join.js').WorldPage} The page's record; its collector receives errors from now on. */
   const record = trackWorldPage(page, user, origin, attachPageErrors(page));

   // Navigate to the join screen and select the configured user.
   await page.goto('/join');
   await page.selectOption('select[name="userid"]', { label: user });

   // Fill the password only when one is configured (the test world has none).
   if (process.env.FOUNDRY_PASSWORD) {
      await page.fill('input[name="password"]', process.env.FOUNDRY_PASSWORD);
   }

   // Submit the join form and wait for the world to load and become ready.
   await page.click('button[name="join"]');
   await page.waitForURL('**/game');
   await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 60_000 });

   await flushPageErrors(page);

   /** @type {string[]} The errors the boot raised. */
   const bootErrors = record.errors.slice(record.checked);
   record.checked = record.errors.length;
   return bootErrors;
}
