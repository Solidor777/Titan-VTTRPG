import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The directory of this setup file, used to resolve the vendor output path.
const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Playwright global setup: bundle fast-check into a self-contained IIFE that exposes the library on
 * the `fc` global, so logic specs can inject it into the Foundry page via `addInitScript`.
 * @returns {Promise<void>} Resolves once `tests/vendor/fast-check.iife.js` has been written.
 */
export default async function globalSetup() {
   // The repo root, used as the module resolution base so the bare `fast-check` import resolves.
   const repoRoot = path.resolve(dirname, '../..');

   // The vendor directory that holds the generated browser bundle (gitignored).
   const vendorDir = path.resolve(dirname, '../vendor');
   await mkdir(vendorDir, { recursive: true });

   // Bundle fast-check into an IIFE exposing the `fc` global for in-page property tests. An inline
   // stdin entry re-exports the package (esbuild entry points are file paths, not bare specifiers).
   await build({
      stdin: {
         contents: "export * from 'fast-check';",
         resolveDir: repoRoot,
         sourcefile: 'fast-check-entry.js',
      },
      bundle: true,
      format: 'iife',
      globalName: 'fc',
      // Promote the IIFE result onto `globalThis`. esbuild's `globalName` emits a bare `var fc = ...`,
      // which Playwright's `addInitScript` traps inside its function wrapper, leaving `fc` invisible to
      // later `page.evaluate` calls. Assigning it to `globalThis` in a footer (same module scope as the
      // `var`) makes it a true page global readable across evaluation contexts.
      footer: {
         js: 'globalThis.fc = fc;',
      },
      platform: 'browser',
      outfile: path.join(vendorDir, 'fast-check.iife.js'),
      logLevel: 'silent',
   });
}
