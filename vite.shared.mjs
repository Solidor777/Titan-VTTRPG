import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { fileURLToPath } from 'url';
import autoprefixer from 'autoprefixer';

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // repo root (this file lives there)

/** @type {Record<string, string>} Shared intra-project import aliases. */
export const alias = {
   '~/': `${path.resolve(__dirname, 'src')}/`,
   '$fonts/': `${path.resolve(__dirname, 'fonts')}/`,
};

/** @type {import('vite').CSSOptions} Shared CSS / PostCSS / SCSS configuration. */
export const css = {
   postcss: {
      plugins: [autoprefixer()],
   },
   preprocessorOptions: {
      scss: {
         api: 'modern-compiler',
      },
   },
};

/**
 * Builds the project's Svelte plugin with the shared SCSS preprocessing.
 * @param {{ emitCss?: boolean }} [options] - When `emitCss` is true (production) component styles are
 * emitted as a separate stylesheet; when false (probe build) the Svelte runtime injects them at mount,
 * so a re-compiled probe bundle's components stay styled despite differing scoped-class hashes.
 * @returns {import('vite').Plugin[]} The configured Svelte plugin array.
 */
export function createSveltePlugin({ emitCss = true } = {}) {
   return svelte({
      configFile: false,
      emitCss,
      preprocess: sveltePreprocess({
         scss: {
            api: 'modern',
            prependData: '@use "src/styles/Root.scss" as *;',
         },
         postcss: {
            plugins: [autoprefixer()],
         },
      }),
      onwarn: (warning, handler) => {
         // Don't warn on preprocess dependencies.
         if (warning.code === 'vite-plugin-svelte-preprocess-many-dependencies') {
            return;
         }

         // Let vite handle all other warnings normally.
         handler(warning);
      },
   });
}
