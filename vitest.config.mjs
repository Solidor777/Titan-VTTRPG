import { svelte } from '@sveltejs/vite-plugin-svelte';
import { sveltePreprocess } from 'svelte-preprocess';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
   plugins: [
      svelte({
         preprocess: sveltePreprocess({
            scss: { prependData: '@use "src/styles/Root.scss" as *;' },
         }),
      }),
   ],
   resolve: {
      conditions: ['browser'],
      dedupe: ['svelte'],
      alias: {
         '~/': `${path.resolve(__dirname, 'src')}/`,
         '$fonts/': `${path.resolve(__dirname, 'fonts')}/`,
      },
   },
   test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./tests/setup.js'],
      include: ['tests/unit/**/*.test.js'],
   },
};
