import path from 'node:path';
import { DEFAULT_GM } from './users.js';
import { joinWorld } from './join.js';
import { expect, flushPageErrors, test } from './harness.js';
import { clickSheetTab } from './actions.js';

export { joinWorld };

/**
 * Logs a test page in to the live world as a user and fails when the boot raised an error: an uncaught page error, or
 * an `Error` core reported through `Hooks.onError` (including from any `init`, `setup` or `ready` listener).
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} [user] - The display name of the Foundry user to log in as.
 * Defaults to `FOUNDRY_USER` env var when set, otherwise `DEFAULT_GM` (`'E2E GM 1'`).
 * @returns {Promise<void>} Resolves once `game.ready === true` and the boot raised no error.
 */
export async function login(page, user = process.env.FOUNDRY_USER || DEFAULT_GM) {
   /** @type {string[]} The errors the boot raised. */
   const bootErrors = await joinWorld(page, user, path.basename(test.info().file));
   expect(bootErrors, `errors while the world booted for ${user}:\n${bootErrors.join('\n')}`).toEqual([]);
}

/**
 * Opens a document's sheet by uuid (a read-side render, not a document change) and waits until its content has
 * mounted.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} uuid - The document's uuid (`Actor.<id>`, `Actor.<id>.Item.<id>`, `Scene.<id>.Token.<id>`, ...).
 * @returns {Promise<import('@playwright/test').Locator>} The sheet's window element.
 */
export async function openSheetByUuid(page, uuid) {
   /** @type {string|null} The element id of the rendered sheet, or null when the uuid resolves to nothing. */
   const appId = await page.evaluate(async (uuid) => {
      /** @type {foundry.abstract.Document|null} The document the uuid names. */
      const document = await fromUuid(uuid);
      if (!document) {
         return null;
      }

      /** @type {foundry.applications.api.ApplicationV2} The rendered sheet. */
      const app = await document.sheet.render({ force: true });
      await titanWait(
         () => !!app.element?.querySelector('.window-content')?.children.length,
         { message: 'sheet mounted' },
      );
      return app.id;
   }, uuid);
   expect(appId, `the uuid ${uuid} resolves to a document`).not.toBeNull();

   // An attribute selector: an AppV2 id can hold characters a CSS id selector rejects.
   /** @type {import('@playwright/test').Locator} The sheet's window element. */
   const sheet = page.locator(`[id="${appId}"]`);
   await expect(sheet).toBeVisible();
   return sheet;
}

/**
 * Opens a document's sheet by uuid, asserts the expected frame is visible, and asserts the render raised no uncaught
 * page error.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} uuid - The document's uuid.
 * @param {string} expectedSelector - CSS selector the rendered sheet's frame must expose (`.titan-player-sheet`, ...).
 * @param {string[]} errors - The spec's shared page-error collector (from `attachPageErrors`).
 * @returns {Promise<import('@playwright/test').Locator>} The sheet's window element.
 */
export async function renderSheet(page, uuid, expectedSelector, errors) {
   /** @type {import('@playwright/test').Locator} The sheet's window element. */
   const sheet = await openSheetByUuid(page, uuid);
   await expect(sheet).toHaveClass(new RegExp(`(^|\\s)${RegExp.escape(expectedSelector.replace('.', ''))}(\\s|$)`));
   await flushPageErrors(page);
   expect(errors, `uncaught errors during render:\n${errors.join('\n')}`).toEqual([]);
   return sheet;
}

/**
 * Click a tab in the tab strip of the open TITAN document sheet. Scoped to the sheet because the sidebar
 * Compendium directory keeps hidden elements whose text equals module pack labels such as "Effects",
 * "Abilities" and "Spells", which a page-wide text locator can match first.
 * @param {import('@playwright/test').Page} page - The Playwright page to drive.
 * @param {string} label - The visible tab label.
 * @returns {Promise<void>} Resolves once the tab is the active one and its operations have finished.
 */
export async function openSheetTab(page, label) {
   await clickSheetTab(page.locator('.application.titan-document-sheet').first(), label);
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
