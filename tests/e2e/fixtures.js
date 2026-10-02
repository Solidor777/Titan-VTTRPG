import { expect } from '@playwright/test';
import { DEFAULT_GM } from './users.js';
import { installPoll } from './poll.js';
import { attachPageErrors, installHookErrorReporting, readHookErrorReports } from './world.js';

/**
 * Authenticate against the live Foundry v14 `/join` screen and wait for the
 * world to become fully ready.
 *
 * Verified selectors against the running v14 join page:
 * `select[name="userid"]` is the user picker (options labelled by user name);
 * `input[name="password"]` is the optional user password field;
 * `button[name="join"]` is the "Join Game Session" submit button.
 *
 * The boot itself must be error-free: no spec's collector exists yet, so `login` fails when the world raised an
 * uncaught page error or core reported an error through `Hooks.onError` (including from any `init`, `setup` or `ready`
 * listener) before it became ready.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} [user] - The display name of the Foundry user to log in as.
 * Defaults to `FOUNDRY_USER` env var when set, otherwise `DEFAULT_GM` (`'E2E GM 1'`).
 * @returns {Promise<void>} Resolves once `game.ready === true` and the boot raised no error.
 */
export async function login(page, user = process.env.FOUNDRY_USER || DEFAULT_GM) {

   // Install the in-page poll helper and hook-error reporting before navigating (addInitScript runs on document
   // load).
   await installPoll(page);
   await installHookErrorReporting(page);

   /** @type {string[]} The uncaught page errors raised from the join screen until the world is ready. */
   const bootPageErrors = [];

   /**
    * Records an uncaught page error raised during the login.
    * @param {Error} error - The uncaught error.
    * @returns {void}
    */
   const onBootPageError = (error) => {
      bootPageErrors.push(error.message);
   };
   page.on('pageerror', onBootPageError);

   try {
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
   }
   finally {
      page.off('pageerror', onBootPageError);
   }

   // Core sets `game.ready` and then calls the `ready` hook synchronously (client/game.mjs:777-779), so every
   // synchronous listener has run, and its report is in the page's list, by the time this read executes.
   /** @type {string[]} The errors the boot raised, page errors first. */
   const bootErrors = [
      ...bootPageErrors,
      ...await readHookErrorReports(page),
   ];
   expect(bootErrors, `errors while the world booted for ${user}:\n${bootErrors.join('\n')}`).toEqual([]);
}

/**
 * Render a single document's sheet inside the live world and assert it appears with no uncaught page
 * errors.
 *
 * The document is located inside the page via a stringified locator function body (e.g.
 * `"() => game.actors.find((a) => a.type === 'player')"`) so the lookup runs in the Foundry runtime, not
 * the Node test process.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} locateSrc - Stringified locator: a function returning the document.
 * @param {string} expectedSelector - CSS selector the rendered sheet must expose.
 * @param {string[]} [errors] - Optional shared page-error collector (from `attachPageErrors`). When
 * omitted, a collector is attached for this single render (legacy/unmigrated behavior).
 * @returns {Promise<void>} Resolves once the sheet is visible and asserted error-free.
 */
export async function renderSheet(page, locateSrc, expectedSelector, errors) {
   // Use the shared collector when supplied; otherwise attach one for this render (page and hook errors).
   const localErrors = errors ?? attachPageErrors(page);

   // Locate the document and trigger its sheet render inside the Foundry runtime.
   const found = await page.evaluate(async (src) => {
      // Reconstruct the locator function from its stringified body.
      const doc = new Function(`return (${src})()`)();
      if (!doc) {
         return false;
      }
      await doc.sheet.render(true);
      return true;
   }, locateSrc);

   // The fixture must exist; assert the sheet is visible and no errors were thrown.
   expect(found, 'document fixture not found in world').toBe(true);
   await expect(page.locator(expectedSelector).first()).toBeVisible();
   expect(localErrors, `uncaught errors during render:\n${localErrors.join('\n')}`).toEqual([]);
}

/**
 * Click a tab in the tab strip of the open TITAN document sheet. Scoped to the sheet because the sidebar
 * Compendium directory keeps hidden elements whose text equals module pack labels such as "Effects",
 * "Abilities" and "Spells", which a page-wide text locator can match first.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} label - The visible tab label.
 * @returns {Promise<void>} Resolves once the tab button has been clicked.
 */
export async function openSheetTab(page, label) {
   await page
      .locator('.application.titan-document-sheet .tab-list')
      .getByText(label, { exact: true })
      .first()
      .click();
}

/**
 * Ensure a document of the given type exists in the world, creating a minimal
 * one when absent, and return a stringified locator that finds it again.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {('Actor'|'Item')} documentType - The base document class name.
 * @param {string} subtype - The document subtype to ensure.
 * @param {string} name - The name to use for a created fixture.
 * @returns {Promise<string>} A stringified locator function body for the ensured document.
 */
export async function ensureDocument(page, documentType, subtype, name) {
   // Create the document only if no document of the subtype already exists.
   await page.evaluate(async ({ documentType, subtype, name }) => {
      // The world collection for the requested document class.
      const collection = documentType === 'Actor' ? globalThis.game.actors : globalThis.game.items;

      // Locate an existing fixture of the subtype, if any.
      const existing = collection.find((d) => d.type === subtype);
      if (!existing) {
         const cls = documentType === 'Actor' ? globalThis.Actor : globalThis.Item;
         await cls.create({
            name,
            type: subtype,
         });
      }
   }, {
      documentType,
      subtype,
      name,
   });

   // Prefer the named fixture (created here) and fall back to any of the subtype.
   const collectionExpr = documentType === 'Actor' ? 'game.actors' : 'game.items';
   return `() => ${collectionExpr}.find((d) => d.type === '${subtype}' && d.name === '${name}') `
      + `?? ${collectionExpr}.find((d) => d.type === '${subtype}')`;
}

/**
 * Collect every user-facing string under a root element that contains the TITAN i18n namespace
 * substring `LOCAL.` — the signature of a missing or double-localized key. Scans text content, the
 * common text-bearing attributes, and tippy tooltip content (read from `_tippy.props.content`, which
 * is populated at mount so no hover is required).
 * @param {import('@playwright/test').Page} page - The Playwright page to evaluate within.
 * @param {string} rootSelector - CSS selector for the root element to scan (e.g. an app element).
 * @returns {Promise<string[]>} The offending strings (deduplicated) found under the root.
 */
export async function collectLocalizationOffenders(page, rootSelector) {
   return page.evaluate((selector) => {
      /** @type {HTMLElement | null} The root element to scan. */
      const root = document.querySelector(selector);
      if (!root) {
         return [`__ROOT_NOT_FOUND__: ${selector}`];
      }

      /** @type {Set<string>} The collected offending strings. */
      const offenders = new Set();

      /** @type {string[]} The text-bearing attributes to inspect on every element. */
      const attributes = [
         'aria-label',
         'title',
         'placeholder',
         'alt',
         'data-tooltip',
      ];

      /**
       * Records a candidate string as an offender when it embeds the `LOCAL.` namespace prefix.
       * @param {unknown} value - The candidate string (ignored when not a non-empty string).
       * @returns {void}
       */
      const consider = (value) => {
         if (typeof value === 'string' && value.includes('LOCAL.')) {
            offenders.add(value.trim());
         }
      };

      // Visible text nodes.
      /** @type {Node} The tree walker over text nodes under the root. */
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
         consider(walker.currentNode.nodeValue);
      }

      // Attributes and tippy content on every element (including the root).
      for (const element of [
         root,
         ...root.querySelectorAll('*'),
      ]) {
         for (const attribute of attributes) {
            consider(element.getAttribute(attribute));
         }

         /** @type {*} The tippy tooltip content, when the element carries a tippy instance. */
         const tippyContent = element._tippy?.props?.content;
         if (typeof tippyContent === 'string') {
            consider(tippyContent);
         }
         else if (tippyContent instanceof HTMLElement) {
            consider(tippyContent.textContent);
            consider(tippyContent.outerHTML);
         }
      }

      return [...offenders];
   }, rootSelector);
}
