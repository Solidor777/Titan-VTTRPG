import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';
import { closeAllApps, clearChat, attachPageErrors } from './world.js';

/** @type {import('@playwright/test').Page} The file-shared, logged-in page (one world boot per file). */
let page;
/** @type {string[]} Uncaught page errors collected during the current test (cleared each afterEach). */
let errors;

test.beforeAll(async ({ browser }) => {
   page = await browser.newPage();
   errors = attachPageErrors(page);
   await login(page);
   await clearChat(page);
});

test.afterEach(async () => {
   await closeAllApps(page);
   errors.length = 0;
});

test.afterAll(async () => {
   await page?.close();
});

test.describe('component probe — Button', () => {
   // Tear down every mounted probe so containers never leak between tests.
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Click me',
            testId: 'probe-button',
         },
         events: ['onclick'],
      });
      await page.locator(`${selector} button`).click();
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(1);
   });

   test('disabled suppresses onclick', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Nope',
            disabled: true,
         },
         events: ['onclick'],
      });
      // force:true bypasses Playwright actionability; the disabled DOM button still dispatches nothing.
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onclick')).toHaveLength(0);
   });

   test('testId resolves to data-testid', async () => {
      const { selector } = await mountProbe(page, 'Button', {
         props: {
            text: 'Tagged',
            testId: 'probe-button',
         },
      });
      await expect(page.locator(`${selector} button[data-testid="probe-button"]`)).toBeVisible();
   });
});

test.describe('component probe — TextInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing commits the value and forwards keyup', async () => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: '',
            testId: 'probe-text',
         },
         events: ['onkeyup', 'onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.fill('hello');
      // TextInput binds the value directly to the DOM input; the bound value is the input's value.
      await expect(input).toHaveValue('hello');
      // A keyup commits through the same seam the sheets rely on.
      await input.press('!');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onkeyup')).toBe(true);
   });

   test('disabled blocks editing', async () => {
      const { selector } = await mountProbe(page, 'TextInput', {
         props: {
            value: 'locked',
            disabled: true,
         },
      });
      const input = page.locator(`${selector} input`);
      await expect(input).toBeDisabled();
      await expect(input).toHaveValue('locked');
   });
});

test.describe('component probe — NumberInput / IntegerInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('NumberInput clamps to max on commit and fires onchange', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            max: 5,
            isInteger: true,
            testId: 'probe-number',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('9');
      // keyup drives parseInput (commit); blur deactivates editing so the display resets to the clamp.
      await input.press('9');
      await input.blur();
      await expect(input).toHaveValue('5');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('IntegerInput commits an integer value', async () => {
      const { selector } = await mountProbe(page, 'IntegerInput', {
         props: {
            value: 0,
            min: 0,
            max: 10,
            testId: 'probe-integer',
         },
         events: ['onchange'],
      });
      const input = page.locator(`${selector} input`);
      await input.focus();
      await input.fill('7');
      // Enter is filtered from the value but still fires keyup, driving the commit without doubling the digit.
      await input.press('Enter');
      await input.blur();
      await expect(input).toHaveValue('7');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks editing', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 3,
            disabled: true,
         },
      });
      await expect(page.locator(`${selector} input`)).toBeDisabled();
   });

   test('testId resolves on NumberInput', async () => {
      const { selector } = await mountProbe(page, 'NumberInput', {
         props: {
            value: 1,
            testId: 'probe-number',
         },
      });
      await expect(page.locator(`${selector} input[data-testid="probe-number"]`)).toBeVisible();
   });
});

test.describe('component probe — CheckboxInput', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('toggling flips the checked glyph and fires onchange', async () => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            testId: 'probe-checkbox',
         },
         events: ['onchange'],
      });
      const button = page.locator(`${selector} button`);
      const check = page.locator(`${selector} button i.fa-check`);
      await expect(check).toHaveCount(0);
      await button.click();
      await expect(check).toHaveCount(1);
      await button.click();
      await expect(check).toHaveCount(0);
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(2);
   });

   test('disabled blocks toggling', async () => {
      const { selector } = await mountProbe(page, 'CheckboxInput', {
         props: {
            value: false,
            disabled: true,
         },
         events: ['onchange'],
      });
      await page.locator(`${selector} button`).click({ force: true });
      const events = await readProbeEvents(page);
      expect(events.filter((e) => e.event === 'onchange')).toHaveLength(0);
   });
});

test.describe('component probe — Select', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('changing the selection fires onchange and updates the value', async () => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            options: [
               { value: 'a', label: 'Alpha' },
               { value: 'b', label: 'Beta' },
            ],
            testId: 'probe-select',
         },
         events: ['onchange'],
      });
      // Drop the mount-time clamp onchange (if any) so we assert only the user-driven change.
      await clearProbeEvents(page);
      const select = page.locator(`${selector} select`);
      await select.selectOption('b');
      await expect(select).toHaveValue('b');
      const events = await readProbeEvents(page);
      expect(events.some((e) => e.event === 'onchange')).toBe(true);
   });

   test('disabled blocks selection', async () => {
      const { selector } = await mountProbe(page, 'Select', {
         props: {
            value: 'a',
            disabled: true,
            options: [
               { value: 'a', label: 'Alpha' },
               { value: 'b', label: 'Beta' },
            ],
         },
      });
      await expect(page.locator(`${selector} select`)).toBeDisabled();
   });
});

test.describe('component probe — LabelTag', () => {
   test.afterEach(async () => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('renders the supplied label and resolves testId', async () => {
      const { selector } = await mountProbe(page, 'LabelTag', {
         props: {
            label: 'Frostbite',
            testId: 'probe-label',
         },
      });
      const tag = page.locator(`${selector} .tag`);
      await expect(tag).toHaveText('Frostbite');
      await expect(page.locator(`${selector} .tag[data-testid="probe-label"]`)).toBeVisible();
   });
});
