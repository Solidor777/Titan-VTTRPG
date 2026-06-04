import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { fileURLToPath } from 'url';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

// ATTENTION!
// Please modify the below variables: s_PACKAGE_ID and s_SVELTE_HASH_ID appropriately.

// For convenience, you just need to modify the package ID below as it is used to fill in default proxy settings for
// the dev server.
const s_PACKAGE_ID = 'systems/titan';

const s_COMPRESS = true;  // Set to true to compress the module bundle.
const s_SOURCEMAPS = true; // Generate sourcemaps for the bundle (recommended).

export default ({ mode }) => {
   /** @type {import('vite').UserConfig} */
   return {
      root: 'src/',                 // Source location / esbuild root.
      base: `/${s_PACKAGE_ID}/`,    // Base module path that 30001 / served dev directory.
      publicDir: false,             // No public resources to copy.
      cacheDir: '../.vite-cache',   // Relative from root directory.

      resolve: {
         conditions: ['import', 'browser'],
         alias: {
            '~/': `${path.resolve(__dirname, 'src')}/`,
            '$fonts/': `${path.resolve(__dirname, 'fonts')}/`,
         },
      },

      esbuild: {
         target: ['es2022'],
      },

      css: {
         postcss: {
            plugins: [autoprefixer()],
         },

         // Use the modern compiler
         preprocessorOptions: {
            scss: {
               api: 'modern-compiler' // or "modern"
            }
         }
      },

      define: {
         'process.env.NODE_ENV': JSON.stringify('production'),
         // Test-only probe harness gate: true only under `vite build --mode e2e`.
         __TITAN_PROBE__: JSON.stringify(mode === 'e2e'),
      },

      // About server options:
      // - Set to `open` to boolean `false` to not open a browser window automatically. This is useful if you set up a
      // debugger instance in your IDE and launch it with the URL: 'http://localhost:30001/game'.
      //
      // - The top proxy entry redirects requests under the module path for `style.css` and following standard static
      // directories: `assets`, `lang`, and `packs` and will pull those resources from the main Foundry / 30000 server.
      // This is necessary to reference the dev resources as the root is `/src` and there is no public / static
      // resources served with this particular Vite configuration. Modify the proxy rule as necessary for your
      // static resources / project.
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
            // Emit CSS as `style.css` to match `system.json` styles and the dev-server proxy. Without this
            // the lib CSS filename follows `fileName` ('index') and Foundry keeps loading a stale style.css.
            cssFileName: 'style',
         },
      },
      plugins: [
         svelte({
            configFile: false,
            preprocess: sveltePreprocess({
               scss: {
                  api: 'modern',
                  prependData: '@use "src/styles/Root.scss" as *;'
               },
               postcss: {
                  plugins: [autoprefixer()]
               }
            }),
            onwarn: (warning, handler) => {
               // Don't warn on preprocess dependencies
               if (warning.code === 'vite-plugin-svelte-preprocess-many-dependencies') {
                  return;
               }

               // let vite handle all other warnings normally
               handler(warning);
            },
         }),
      ],
   };
};
