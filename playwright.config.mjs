import { defineConfig } from '@playwright/test';

/**
 * Chromium launch arguments. Headless Chromium defaults to the SwiftShader software rasterizer, which
 * renders Foundry's PIXI canvas on the CPU across every available core; `--enable-gpu` binds the real
 * adapter through ANGLE instead. Verified minimal: `--use-angle` pins a backend unnecessarily and
 * `--ignore-gpu-blocklist` has no effect on its own. Set `TITAN_E2E_GPU=0` to fall back to software
 * rendering on a machine with no usable GPU.
 * @type {string[]}
 */
const chromiumArgs = process.env.TITAN_E2E_GPU === '0' ? [] : ['--enable-gpu'];

export default defineConfig({
   testDir: './tests/e2e',
   timeout: 60_000,
   fullyParallel: false,
   workers: 1,
   globalSetup: './tests/e2e/global-setup.js',
   // The default list output, plus a diagnostic ranking of operations over the duration budget.
   reporter: [
      ['list'],
      ['./tests/e2e/slow-operation-reporter.js'],
   ],
   use: {
      baseURL: 'http://localhost:30000',
      headless: true,
      // Foundry v14 requires 1366x768 and otherwise raises a permanent resolution warning whose
      // notification banner spans the viewport and intercepts clicks on anything beneath it (the
      // player HUD sits under that band). Playwright's 1280x720 default is below that minimum.
      viewport: {
         width: 1920,
         height: 1080,
      },
      launchOptions: {
         args: chromiumArgs,
      },
   },
   // Reuse a running Foundry on :30000; otherwise launch it directly (no UAC elevation) and wait.
   webServer: {
      command: 'node foundry/main.js --dataPath=/foundryvtt/V14/dev/foundryuserdata',
      cwd: 'C:/FoundryVTT/V14/dev',
      url: 'http://localhost:30000',
      reuseExistingServer: true,
      timeout: 120_000,
   },
});
