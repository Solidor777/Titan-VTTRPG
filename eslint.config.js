import eslintPluginSvelte from 'eslint-plugin-svelte';

export default [
   // add more generic rule sets here, such as:
   // js.configs.recommended,
   ...eslintPluginSvelte.configs['flat/recommended'],
   {
      rules: {
         'svelte/no-at-html-tags': 'off',
         'svelte/no-unused-svelte-ignore': 'off',
      },
   },
   {
      ignores: [
         '.vite-cache/',
         '.github/',
         'dist/',
         'docs/',
         'external/',
         'lang/',
         'scripts/',
         'styles/',
         'templates/',
         'index.js',
         'node_modules/',
      ],
   },
];
