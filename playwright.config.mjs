import { defineConfig } from '@playwright/test';

export default defineConfig({
   testDir: './tests/e2e',
   timeout: 60_000,
   fullyParallel: false,
   workers: 1,
   use: {
      baseURL: 'http://localhost:30000',
      headless: true,
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
