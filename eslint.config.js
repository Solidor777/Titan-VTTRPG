import eslintPluginSvelte from 'eslint-plugin-svelte';
import jsdoc from 'eslint-plugin-jsdoc';
import stylistic from '@stylistic/eslint-plugin';
import arrayLiteralNewlineRule from './eslint/rules/array-literal-newline.js';

export default [
   // add more generic rule sets here, such as:
   // js.configs.recommended,
   ...eslintPluginSvelte.configs['flat/recommended'],
   {
      plugins: {
         jsdoc,
         '@stylistic': stylistic,
         titan: {
            rules: {
               'array-literal-newline': arrayLiteralNewlineRule,
            },
         },
      },
      settings: {
         jsdoc: {
            // Keep `@extends` (matches the ES `class extends` keyword and the
            // mandated house style) instead of the plugin's `@augments` default.
            tagNamePreference: {
               augments: 'extends',
            },
         },
      },
      rules: {
         'svelte/no-at-html-tags': 'off',
         'svelte/html-quotes/dynamic/quoted': 'off',
         'svelte/no-unused-svelte-ignore': 'off',
         'jsdoc/check-access': 1, // Recommended
         'jsdoc/check-alignment': 1, // Recommended
         // 'jsdoc/check-examples': 1,
         'jsdoc/check-indentation': 1,
         'jsdoc/check-line-alignment': 1,
         'jsdoc/check-param-names': 1, // Recommended
         'jsdoc/check-property-names': 1, // Recommended
         'jsdoc/check-syntax': 1,
         'jsdoc/check-tag-names': 1, // Recommended
         'jsdoc/check-types': 1, // Recommended
         'jsdoc/check-values': 1, // Recommended
         'jsdoc/empty-tags': 1, // Recommended
         'jsdoc/implements-on-classes': 1, // Recommended
         'jsdoc/informative-docs': 1,
         'jsdoc/match-description': 1,
         'jsdoc/multiline-blocks': 1, // Recommended
         'jsdoc/no-bad-blocks': 1,
         'jsdoc/no-blank-block-descriptions': 1,
         // 'jsdoc/no-defaults': 1,
         // 'jsdoc/no-missing-syntax': 1,
         'jsdoc/no-multi-asterisks': 1, // Recommended
         // 'jsdoc/no-restricted-syntax': 1,
         // 'jsdoc/no-types': 1,
         // 'jsdoc/no-undefined-types': 1, // Recommended
         'jsdoc/require-asterisk-prefix': 1,
         'jsdoc/require-description': 1,
         'jsdoc/require-description-complete-sentence': [
            1,
            {
               // Prevents the fixer from treating the word after these abbreviations as a new sentence
               // and capitalizing it.
               abbreviations: [
                  'e.g.',
                  'i.e.',
                  'etc.',
                  'vs.',
                  'cf.',
               ],
            },
         ],
         // 'jsdoc/require-example': 1,
         // 'jsdoc/require-file-overview': 1,
         'jsdoc/require-hyphen-before-param-description': 1,
         'jsdoc/require-jsdoc': 1, // Recommended
         'jsdoc/require-param': 1, // Recommended
         'jsdoc/require-param-description': 1, // Recommended
         'jsdoc/require-param-name': 1, // Recommended
         'jsdoc/require-param-type': 1, // Recommended
         'jsdoc/require-property': 1, // Recommended
         'jsdoc/require-property-description': 1, // Recommended
         'jsdoc/require-property-name': 1, // Recommended
         'jsdoc/require-property-type': 1, // Recommended
         'jsdoc/require-returns': 1, // Recommended
         'jsdoc/require-returns-check': 1, // Recommended
         'jsdoc/require-returns-description': 1, // Recommended
         'jsdoc/require-returns-type': 1, // Recommended
         'jsdoc/require-throws': 1,
         'jsdoc/require-yields': 1, // Recommended
         'jsdoc/require-yields-check': 1, // Recommended
         'jsdoc/sort-tags': 1,
         'jsdoc/tag-lines': 1, // Recommended
         // 'jsdoc/valid-types': 1 // Recommended
         'capitalized-comments': 'off',

         // House formatting rules (.claude/CLAUDE.md): 120-char wrap, multi-line conditionals, and
         // multi-line object/array literals.
         '@stylistic/max-len': [
            'error',
            {
               code: 120,
               ignoreUrls: true,
               ignoreRegExpLiterals: true,
            },
         ],
         curly: [
            'error',
            'all',
         ],
         // Scoped to ObjectExpression only: object literals with 2+ properties must break after `{`
         // and before `}`; destructuring patterns, imports, and exports are untouched. Verified with a
         // scratch fixture: a single-property object written multi-line is not an error, and a
         // two-property object on one line is.
         '@stylistic/object-curly-newline': [
            'error',
            {
               ObjectExpression: {
                  multiline: true,
                  minProperties: 2,
                  consistent: true,
               },
            },
         ],
         // Verified against the same scratch fixture: this rule does not fire on ObjectPattern
         // (destructuring), so no extra scoping is needed.
         '@stylistic/object-property-newline': [
            'error',
            {
               allowAllPropertiesOnSameLine: false,
            },
         ],
         // Array literals only (not destructuring patterns); see eslint/rules/array-literal-newline.js.
         'titan/array-literal-newline': 'error',
         // Trailing commas on every multi-line object/array/import/export/function-arg list; matches
         // the pre-existing codebase convention (verified 3,902 uses vs. 83 exceptions pre-lint).
         '@stylistic/comma-dangle': [
            'error',
            'always-multiline',
         ],
         // No blank trailing whitespace on any line.
         '@stylistic/no-trailing-spaces': 'error',
         // Every file ends with exactly one trailing newline.
         '@stylistic/eol-last': 'error',
      },
   },
   {
      // @stylistic/indent understands plain JS/ESM ASTs; run unscoped against .svelte files it
      // misjudges markup-nested mustache expressions (e.g. under `{#if}`) as JS continuation lines,
      // producing 41 false positives across 14 files. svelte/indent (template-aware) covers .svelte
      // files instead.
      files: [
         '**/*.{js,mjs,cjs}',
      ],
      rules: {
         '@stylistic/indent': [
            'error',
            3,
            {
               SwitchCase: 1,
            },
         ],
      },
   },
   {
      files: [
         '**/*.svelte',
      ],
      rules: {
         'svelte/indent': [
            'error',
            {
               indent: 3,
               switchCase: 1,
            },
         ],
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
         'styles/',
         'templates/',
         'node_modules/',
         'fix-comments.js',
         'count-long.cjs',
         'test/build/',
      ],
   },
];
