import autoprefixer from 'autoprefixer';
import { sveltePreprocess } from 'svelte-preprocess';

const config = {
   preprocess: sveltePreprocess({
      scss: {
         api: 'modern',
         prependData: '@use "src/Styles/Root.scss" as *;'
      },
      postcss: {
         plugins: [autoprefixer()]
      }
   }),
};

export default config;
