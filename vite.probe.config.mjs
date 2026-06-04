import path from 'path';
import { fileURLToPath } from 'url';
import { alias, css, createSveltePlugin } from './vite.shared.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Standalone build of the e2e component-probe. Emits a self-contained IIFE to `test/build/` that, when
 * injected into a ready Foundry page, registers `game.titan._probe`. This bundle is NEVER part of a
 * system build — it is the structural guarantee behind Strict Rule 1.
 * @type {import('vite').UserConfig}
 */
export default {
   root: 'src/',
   publicDir: false,
   cacheDir: '../.vite-cache',

   resolve: {
      conditions: ['import', 'browser'],
      alias,
   },

   esbuild: {
      target: ['es2022'],
   },

   css,

   define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
   },

   build: {
      outDir: path.join(__dirname, 'test/build'),
      // Self-cleaning per Rule 2: a standalone `npm run build:e2e` wipes test/build first. global-setup
      // builds the probe BEFORE fast-check so this clean never removes the fast-check bundle.
      emptyOutDir: true,
      sourcemap: false,
      minify: false,
      target: ['es2022'],
      lib: {
         entry: './test-probe/probeBundleEntry.js',
         formats: ['iife'],
         name: 'TitanProbe',
         fileName: 'probe',
      },
   },

   // emitCss:false → the Svelte runtime injects component styles at mount, so probe-mounted components
   // stay styled despite scoped-class hashes differing from the system's dist/style.css. Non-scoped
   // global CSS (e.g. tippy.js) is still extracted as probe.css and injected separately by the harness.
   plugins: [
      createSveltePlugin({ emitCss: false }),
   ],
};
