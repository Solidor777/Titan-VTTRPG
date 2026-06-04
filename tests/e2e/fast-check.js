import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} The absolute path to the fast-check IIFE bundle produced by global-setup.js. */
const FAST_CHECK_BUNDLE = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../test/build/fast-check.iife.js',
);

/**
 * Inject the fast-check library into the page so it is available as the `fc` global before any page
 * navigation. Must be called before `login(page)` so the init script is present on the join/game load.
 * @param {import('@playwright/test').Page} page - The Playwright page to inject into.
 * @returns {Promise<void>} Resolves once the init script is registered.
 */
export async function injectFastCheck(page) {
   await page.addInitScript({ path: FAST_CHECK_BUNDLE });
}
