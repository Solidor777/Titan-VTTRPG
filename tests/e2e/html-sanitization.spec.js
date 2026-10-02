import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { mountProbe, unmountAll } from './componentProbe.js';
import { attachPageErrors, closeAllApps, showChatLog } from './world.js';

/**
 * User-written HTML reaches two sinks: tooltips (tippy renders its content as HTML) and rich text (enrichHTML assigns
 * its input to a live element, then the component renders the result). Both clean it with core's HTML cleaner first:
 * a report message and a report tag tooltip carrying an event-handler payload render their text and markup with no
 * handler, and icon markup survives cleaning. The live custom-trait tooltip that is updated to the payload is covered
 * in `custom-traits.spec.js`.
 */

/** @type {string} HTML whose image carries an event handler that sets a page flag when the image fails to load. */
const PAYLOAD = '<p>E2E sanitized text</p><img src="e2e-missing-image.png" onerror="window.__titanXss = true">';

/** @type {string} The payload's image once cleaned: the same element without its handler. */
const CLEAN_IMAGE = '<img src="e2e-missing-image.png">';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await showChatLog(page);
});

test.afterEach(async () => {
   await unmountAll(page);
   await closeAllApps(page);
   expect(errors, `uncaught page errors:\n${errors.join('\n')}`).toEqual([]);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

/**
 * Posts a turn-start report with the given system data.
 * @param {object} system - The report's system data beyond its actor fields.
 * @returns {Promise<string>} The report's id.
 */
function postTurnStartReport(system) {
   return page.evaluate(async (data) => {
      delete window.__titanXss;

      /** @type {ChatMessage} The report. */
      const message = await ChatMessage.create({
         speaker: { alias: 'E2E Sanitization' },
         system: {
            actorImg: 'icons/svg/mystery-man.svg',
            actorName: 'E2E Sanitization',
            ...data,
         },
         type: 'turnStartReport',
      });
      return message.id;
   }, system);
}

test('a turn-start report message renders its text and markup without the event handler', async () => {
   /** @type {string} The report's id. */
   const id = await postTurnStartReport({ message: [PAYLOAD] });

   /** @type {import('@playwright/test').Locator} The report's rendered message. */
   const richText = page.locator(`#chat .message[data-message-id="${id}"] .messages .rich-text`);
   await expect(richText).toContainText('E2E sanitized text');

   /** @type {import('@playwright/test').Locator} The message's image, whose load fails. */
   const image = richText.locator('img');
   await expect(image).toHaveCount(1);
   await expect.poll(() => image.evaluate((element) => element.complete), { message: 'the image load settled' })
      .toBe(true);

   // The image was inserted and its failed load settled (the positive edge); a kept handler would have fired by now.
   expect(await image.getAttribute('onerror')).toBeNull();
   expect(await page.evaluate(() => window.__titanXss)).toBeUndefined();
});

test('a report tag tooltip holds the cleaned HTML and renders it without the event handler', async () => {
   /** @type {string} The report's id. */
   const id = await postTurnStartReport({
      conditions: [
         {
            description: PAYLOAD,
            img: 'icons/svg/blind.svg',
            label: 'E2E Sanitized Condition',
         },
      ],
   });

   /** @type {string} The payload as core's cleaner returns it. */
   const expected = await page.evaluate((payload) => foundry.utils.cleanHTML(payload), PAYLOAD);
   expect(expected).toContain(CLEAN_IMAGE);
   expect(expected).not.toContain('onerror');

   /** @type {import('@playwright/test').Locator} The report's condition tag. */
   const tag = page.locator(`#chat .message[data-message-id="${id}"] .report .effects .effect > .tag`);
   await expect(tag).toContainText('E2E Sanitized Condition');
   await expect.poll(() => tag.evaluate((element) => element._tippy?.props?.content)).toBe(expected);

   // The tooltip is shown through tippy's `show`, which skips the hover delay: `TooltipAction.js` delays a hover's show
   // by 1000 ms and animates it for 400 ms, longer than the suite's 1 s ceiling on a wait inside a loaded page. The
   // image is inserted and its failed load settles without a handler.
   await tag.evaluate((element) => element._tippy.show());

   /** @type {import('@playwright/test').Locator} The rendered tooltip's image. */
   const tooltipImage = page.locator('.tippy-box img[src="e2e-missing-image.png"]');
   await expect(tooltipImage).toHaveCount(1);
   await expect.poll(() => tooltipImage.evaluate((element) => element.complete)).toBe(true);
   expect(await tooltipImage.getAttribute('onerror')).toBeNull();
   expect(await page.evaluate(() => window.__titanXss)).toBeUndefined();
});

test('tooltip icon markup survives cleaning while an event handler does not', async () => {
   const { selector } = await mountProbe(page, 'Tag', {
      props: {
         text: 'E2E Icon Tooltip',
         tooltip: {
            localize: false,
            text: `<p><i class="fas fa-dice-d20"></i> E2E roll</p>${PAYLOAD}`,
         },
      },
   });

   /** @type {string|undefined} The tooltip tippy holds. */
   const content = await page.locator(`${selector} .tag`).evaluate((element) => element._tippy?.props?.content);
   expect(content).toContain('<i class="fas fa-dice-d20"></i>');
   expect(content).toContain(CLEAN_IMAGE);
   expect(content).not.toContain('onerror');
});
