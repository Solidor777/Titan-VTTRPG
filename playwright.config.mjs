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
   // Every wait on something inside an already-loaded page is at most 1 s (`.claude/claude.md` "Project Scope");
   // `expect` and `expect.poll` use this ceiling unless a call sets a lower one.
   expect: { timeout: 1000 },
   fullyParallel: false,
   workers: 1,
   globalSetup: './tests/e2e/global-setup.js',
   globalTeardown: './tests/e2e/global-teardown.js',
   // The default list output, plus a diagnostic ranking of operations over the duration budget.
   reporter: [
      ['list'],
      ['./tests/e2e/slow-operation-reporter.js'],
   ],
   use: {
      baseURL: 'http://localhost:30000',
      headless: true,
      // Caps each Playwright action (click, fill, drag, hover, and any page method called without its own timeout),
      // so an action waiting on a missing element fails after 10 s instead of at the 60 s test timeout (the default
      // is no limit). Measured over two full runs with the slow-operation threshold at 50 ms
      // (`e2e-r3d-gate-1-slowops.json`, `e2e-r3d-gate-2-slowops.json`): the longest action was 965 ms (a click on a new
      // effect row's Edit Item button, `flows.js:860`; 464 ms in the other run), so 10 s is about ten times the longest. Waits that legitimately
      // take longer pass their own timeout (world boot 60 s, reload 60 s).
      actionTimeout: 10_000,
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
   // Reuse a running Foundry on :30000; otherwise launch it through the supervisor, which kills the launched
   // server when the run ends or the Playwright runner itself disappears (no orphaned Foundry holding the
   // port and the pack locks). A launched server opens the test world directly. Paths and the world are
   // derived from this repo's location; FOUNDRY_APP_DIR / FOUNDRY_DATA_PATH / FOUNDRY_PORT / FOUNDRY_WORLD
   // override them.
   webServer: {
      command: 'node scripts/e2e-foundry-server.mjs',
      url: 'http://localhost:30000',
      reuseExistingServer: true,
      timeout: 120_000,
   },
});
