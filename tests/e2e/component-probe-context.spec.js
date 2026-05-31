import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';
import { mountProbe, unmountAll, clearProbeEvents, documentContext } from './componentProbe.js';

test.describe('component probe — RichText (context)', () => {
   test.beforeEach(async ({ page }) => {
      await login(page);
   });
   test.afterEach(async ({ page }) => {
      await unmountAll(page);
      await clearProbeEvents(page);
   });

   test('enriches its value into the rich-text div using the document context', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RichText', {
         props: {
            value: '<p>Hello <strong>world</strong></p>',
         },
         context: documentContext({ isOwner: true }),
      });
      const div = page.locator(`${selector} .rich-text`);
      await expect(div).toContainText('Hello world');
      await expect(div).not.toHaveClass(/not-owner/);
   });

   test('marks the div not-owner when the document context is not the owner', async ({ page }) => {
      const { selector } = await mountProbe(page, 'RichText', {
         props: {
            value: '<p>Secret</p>',
         },
         context: documentContext({ isOwner: false }),
      });
      await expect(page.locator(`${selector} .rich-text`)).toHaveClass(/not-owner/);
   });
});
