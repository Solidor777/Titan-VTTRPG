import { test, expect } from '@playwright/test';
import { login } from './fixtures.js';

// Empirical guards (CLOSED_BUGS #30/#31): validated by reading the FINAL COMPUTED STYLE of the live
// rendered theme-editor elements — never by inspecting the build or forcing synthetic-only conditions.

test('theme editor h3 uses the header token, and light-theme panel-1 is stepped', async ({ page }) => {
   await login(page);

   const result = await page.evaluate(async () => {
      const original = game.settings.get('titan', 'theme');
      try {
         await game.settings.set('titan', 'theme', 'heritage-light');
         const editor = new (game.settings.menus.get('titan.themeEditor').type)();
         await editor.render(true);
         const start = Date.now();
         while (!editor.element?.querySelector('section h3') && Date.now() - start < 5000) {
            await new Promise((r) => requestAnimationFrame(r));
         }
         const h3 = editor.element.querySelector('section h3');
         const defaultColor = getComputedStyle(h3).color;

         // Override only the header-3 token and re-read: proves the heading tracks the header token
         // specifically, not a coincidental match with the body color or Foundry's --color-text-primary.
         document.documentElement.style.setProperty('--titan-header-3-font-color', '#aa3377');
         const overriddenColor = getComputedStyle(h3).color;
         document.documentElement.style.removeProperty('--titan-header-3-font-color');

         const panel1 = getComputedStyle(document.documentElement)
            .getPropertyValue('--titan-panel-1-background').trim();
         await editor.close();
         return { defaultColor, overriddenColor, panel1 };
      }
      finally {
         await game.settings.set('titan', 'theme', original);
      }
   });

   expect(result.defaultColor).toBe('rgb(38, 38, 38)');
   expect(result.overriddenColor).toBe('rgb(170, 51, 119)');
   expect(result.panel1).toBe('#e4e7ee');
});

test('theme editor preview shows the three stepped panels and per-level headers', async ({ page }) => {
   await login(page);

   const result = await page.evaluate(async () => {
      const original = game.settings.get('titan', 'theme');
      try {
         await game.settings.set('titan', 'theme', 'heritage-light');
         const editor = new (game.settings.menus.get('titan.themeEditor').type)();
         await editor.render(true);
         const start = Date.now();
         while (!editor.element?.querySelector('.preview .panel-3') && Date.now() - start < 5000) {
            await new Promise((r) => requestAnimationFrame(r));
         }
         const preview = editor.element.querySelector('.preview');
         const bg = (sel) => getComputedStyle(preview.querySelector(sel)).backgroundColor;

         const out = {
            panel1Bg: bg('.panel-1'),
            panel2Bg: bg('.panel-2'),
            panel3Bg: bg('.panel-3'),
            headerColorBefore: getComputedStyle(preview.querySelector('.headers h3')).color,
         };

         // Drive the preview's own draft token and confirm the preview header follows it.
         preview.style.setProperty('--titan-header-3-font-color', '#aa3377');
         out.headerColorAfter = getComputedStyle(preview.querySelector('.headers h3')).color;

         await editor.close();
         return out;
      }
      finally {
         await game.settings.set('titan', 'theme', original);
      }
   });

   // The three preview panels render the (darkened) HeritageLight ramp, each distinct.
   expect(result.panel1Bg).toBe('rgb(228, 231, 238)'); // #e4e7ee
   expect(result.panel2Bg).toBe('rgb(208, 213, 223)'); // #d0d5df
   expect(result.panel3Bg).toBe('rgb(188, 195, 209)'); // #bcc3d1
   expect(new Set([result.panel1Bg, result.panel2Bg, result.panel3Bg]).size).toBe(3);
   // The preview headers are driven by the per-level header tokens.
   expect(result.headerColorBefore).toBe('rgb(38, 38, 38)');
   expect(result.headerColorAfter).toBe('rgb(170, 51, 119)');
});
