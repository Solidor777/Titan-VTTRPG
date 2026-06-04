import { build as esbuildBuild } from 'esbuild';
import { build as viteBuild } from 'vite';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} The directory of this setup file, used to resolve repo paths. */
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright global setup: build the two self-contained test bundles into `test/build/`.
 * Builds the component-probe IIFE (Vite + Svelte) first — its `emptyOutDir` cleans `test/build/`.
 * Then builds the fast-check IIFE (esbuild) so the probe's clean does not wipe it.
 * @returns {Promise<void>} Resolves once both bundles have been written.
 */
export default async function globalSetup() {
   /** @type {string} The repo root, used as the module-resolution base and the config location. */
   const repoRoot = path.resolve(dirname, '../..');

   /** @type {string} The output directory for built test artifacts (gitignored, self-cleaning). */
   const buildDir = path.resolve(repoRoot, 'test/build');

   // 1. Build the component-probe IIFE → test/build/probe.iife.js (clears test/build/ via emptyOutDir).
   await viteBuild({ configFile: path.resolve(repoRoot, 'vite.probe.config.mjs') });

   // 2. Bundle fast-check into an IIFE exposing the `fc` global for in-page property tests. An inline
   // stdin entry re-exports the package (esbuild entry points are file paths, not bare specifiers).
   await mkdir(buildDir, { recursive: true });
   await esbuildBuild({
      stdin: {
         contents: "export * from 'fast-check';",
         resolveDir: repoRoot,
         sourcefile: 'fast-check-entry.js',
      },
      bundle: true,
      format: 'iife',
      globalName: 'fc',
      // Promote the IIFE result onto `globalThis` so `fc` is readable across page.evaluate contexts.
      footer: {
         js: 'globalThis.fc = fc;',
      },
      platform: 'browser',
      outfile: path.join(buildDir, 'fast-check.iife.js'),
      logLevel: 'silent',
   });
}
