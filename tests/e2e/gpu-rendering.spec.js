import { expect, test } from '@playwright/test';

/**
 * Reads the unmasked WebGL renderer string from a page. ANGLE resolves one graphics backend per
 * browser process, so a context created on any page reports the same adapter Foundry's PIXI canvas
 * draws through — no world boot is needed to establish which backend the suite is running on.
 * @param {import('@playwright/test').Page} page - The page to evaluate within.
 * @returns {Promise<string>} The unmasked renderer string naming the adapter or software rasterizer.
 */
async function readRenderer(page) {
   return page.evaluate(() => {
      /** @type {WebGL2RenderingContext | null} A throwaway context used only to identify the backend. */
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
         return 'NO_WEBGL2_CONTEXT';
      }

      /** @type {*} The extension exposing the real adapter behind ANGLE's masked strings. */
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
   });
}

test.describe('GPU rendering', () => {
   // Guards the `--enable-gpu` launch argument: without it Chromium silently falls back to the
   // SwiftShader CPU rasterizer, which renders the canvas across every core and slows the whole suite.
   test('the suite renders on a hardware adapter', async ({ browser }) => {
      test.skip(process.env.TITAN_E2E_GPU === '0', 'GPU rendering explicitly disabled via TITAN_E2E_GPU=0.');

      /** @type {import('@playwright/test').Page} A bare page; the backend is a browser-level property. */
      const page = await browser.newPage();

      try {
         /** @type {string} The unmasked adapter the browser resolved for WebGL. */
         const renderer = await readRenderer(page);

         expect(renderer, 'WebGL2 must be available to render the Foundry canvas').not.toBe('NO_WEBGL2_CONTEXT');
         expect(renderer, `expected a hardware adapter, got software rendering: ${renderer}`)
            .not.toMatch(/SwiftShader|Software|llvmpipe/i);
      }
      finally {
         await page.close();
      }
   });
});
