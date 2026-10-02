import { expect, test } from './harness.js';
import { login } from './fixtures.js';
import { mountProbe, unmountAll } from './componentProbe.js';
import { attachPageErrors, closeAllApps, showChatLog } from './world.js';

/**
 * User-written HTML reaches two sinks: tooltips (tippy renders its content as HTML) and rich text (enrichHTML assigns
 * its input to a live element, then the component renders the result). Both clean it with core's HTML cleaner first:
 * a report message and a report tag tooltip carrying an event-handler payload render their text and markup with no
 * handler, a live tooltip updated to the payload is cleaned on update, and icon markup survives cleaning.
 */

/** @type {string} HTML whose image carries an event handler that sets a page flag when the image fails to load. */
const PAYLOAD = '<p>E2E sanitized text</p><img src="e2e-missing-image.png" onerror="window.__titanXss = true">';

/** @type {string} The payload's image once cleaned: the same element without its handler. */
const CLEAN_IMAGE = '<img src="e2e-missing-image.png">';

/** @type {string} Name of the throwaway weapon whose custom-trait tooltip is updated live. */
const ITEM_NAME = 'E2E Sanitization Weapon';

/** @type {string} Name of the weapon's custom trait. */
const TRAIT_NAME = 'E2E Sanitized Trait';

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
   await page.evaluate(async (name) => {
      await game.items.getName(name)?.delete();
   }, ITEM_NAME);
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

   // Hovering renders the tooltip: its image is inserted and its failed load settles without a handler.
   await tag.hover();

   /** @type {import('@playwright/test').Locator} The rendered tooltip's image. */
   const tooltipImage = page.locator('.tippy-box img[src="e2e-missing-image.png"]');
   await expect(tooltipImage).toHaveCount(1);
   await expect.poll(() => tooltipImage.evaluate((element) => element.complete)).toBe(true);
   expect(await tooltipImage.getAttribute('onerror')).toBeNull();
   expect(await page.evaluate(() => window.__titanXss)).toBeUndefined();
});

test('a live tooltip updated to user HTML is cleaned on update', async () => {
   /** @type {{first: string, payload: string}} The first description and the payload, cleaned by core's cleaner. */
   const cleaned = await page.evaluate(async ({ itemName, payload, traitName }) => {
      await game.items.getName(itemName)?.delete();

      /** @type {TitanItem} A weapon with one custom trait. */
      const item = await Item.create({
         name: itemName,
         system: {
            customTrait: [
               {
                  description: '<p>E2E first description</p>',
                  name: traitName,
                  uuid: 'e2e-sanitization-trait',
               },
            ],
         },
         type: 'weapon',
      });

      /** @type {ApplicationV2} The weapon's sheet. */
      const app = await item.sheet.render(true);
      await titanWait(() => !!app?.element?.querySelector('.sidebar'), { message: 'sheet mounted' });
      return {
         first: foundry.utils.cleanHTML('<p>E2E first description</p>'),
         payload: foundry.utils.cleanHTML(payload),
      };
   }, {
      itemName: ITEM_NAME,
      payload: PAYLOAD,
      traitName: TRAIT_NAME,
   });

   // Mark the trait label that carries the tooltip, and read its first content.
   /** @type {string|null} The tooltip's first content, or null when the label is not found. */
   const first = await page.evaluate((name) => {
      /** @type {Element|undefined} The trait label carrying the tooltip. */
      const label = [...document.querySelectorAll('.sidebar .tag *')]
         .find((element) => element._tippy && element.textContent.trim() === name);
      if (!label) {
         return null;
      }
      label.__e2eMarked = true;
      return label._tippy.props.content;
   }, TRAIT_NAME);
   expect(first).toBe(cleaned.first);

   await page.evaluate(async ({ itemName, payload }) => {
      /** @type {TitanItem} The weapon. */
      const item = game.items.getName(itemName);
      await item.update({
         'system.customTrait': [
            {
               ...item.system.customTrait[0],
               description: payload,
            },
         ],
      });
   }, {
      itemName: ITEM_NAME,
      payload: PAYLOAD,
   });

   // The same (still marked) label holds the cleaned payload, so the action's update path cleaned it.
   await expect.poll(() => page.evaluate(() => {
      /** @type {Element|undefined} The marked label, if it was kept. */
      const label = [...document.querySelectorAll('.sidebar .tag *')].find((element) => element.__e2eMarked);
      return label ? label._tippy?.props?.content : 'the marked label was replaced';
   })).toBe(cleaned.payload);
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
