import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, readProbeEvents, clearProbeEvents, unmountAll } from './componentProbe.js';

test.describe('component probe — Button', () => {
   // Authenticate as E2E GM 1 before each probe.
   test.beforeEach(async ({ page }) => {
      await login(page);
   });

   // Tear down every mounted probe so containers never leak between tests.
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('click fires onclick', async ({ page }) => {
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

   test('disabled suppresses onclick', async ({ page }) => {
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

   test('testId resolves to data-testid', async ({ page }) => {
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
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('typing commits the value and forwards keyup', async ({ page }) => {
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

   test('disabled blocks editing', async ({ page }) => {
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
