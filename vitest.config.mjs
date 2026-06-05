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
      // The schema golden-master suites dynamically import large data-model graphs inside beforeAll,
      // which compiles those graphs through the Svelte/Vite transform pipeline. Under a full parallel
      // run that legitimately exceeds vitest's generic 10s default and intermittently times the hooks
      // out, so give hooks deterministic headroom (the hooks either complete or genuinely hang).
      hookTimeout: 60000,
   },
};
