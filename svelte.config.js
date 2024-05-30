import preprocess from 'svelte-preprocess';
import autoprefixer from 'autoprefixer';

const config = {
   preprocess: preprocess({
      scss: {
         prependData: '@import "src//Styles/Mixins.scss";'
      },
      postcss: {
         plugins: [autoprefixer()]
      }
   })
};

export default config;
