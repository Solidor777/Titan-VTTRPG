import path from 'path';
import { fileURLToPath } from 'url';
import { alias, css, createSveltePlugin } from './vite.shared.mjs';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// For convenience, modify the package ID below; it fills in default proxy settings for the dev server.
const s_PACKAGE_ID = 'systems/titan';

const s_COMPRESS = true;  // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

export default ({ mode }) => {
   /** @type {import('vite').UserConfig} */
   return {
      root: 'src/',                 // Source location / esbuild root.
      base: `/${s_PACKAGE_ID}/`,    // Base module path served by the dev server.
      publicDir: false,             // No public resources to copy.
      cacheDir: '../.vite-cache',   // Relative from root directory.

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
         // Test-only probe harness gate: true only under `vite build --mode e2e`.
         __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
      },

      server: {
         port: 30001,
         open: '/game',
         proxy: {
            // Serves static files from main Foundry server.
            [`^(/${s_PACKAGE_ID}/(assets|lang|packs|dist/style.css))`]: 'http://localhost:30000',

            // All other paths besides package ID path are served from main Foundry server.
            [`^(?!/${s_PACKAGE_ID}/)`]: 'http://localhost:30000',

            // Enable socket.io from main Foundry server.
            '/socket.io': { target: 'ws://localhost:30000', ws: true },
         },
      },
      build: {
         outDir: path.join(__dirname, 'dist'),
         emptyOutDir: true,
         sourcemap: s_SOURCEMAPS,
         brotliSize: true,
         minify: s_COMPRESS ? 'terser' : false,
         target: ['es2022'],
         terserOptions: s_COMPRESS ? { ecma: 2022 } : void 0,
         lib: {
            entry: './index.js',
            formats: ['es'],
            fileName: 'index',
            // Emit CSS as `style.css` to match `system.json` styles and the dev-server proxy.
            cssFileName: 'style',
         },
      },
      plugins: [
         createSveltePlugin(),
      ],
   };
};
