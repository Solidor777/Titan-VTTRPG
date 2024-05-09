import preprocess from 'svelte-preprocess';

const config = {
   preprocess: preprocess({
      scss: {
         prependData: '@import "src//Styles/Mixins.scss";'
      }
   })
};

export default config;
