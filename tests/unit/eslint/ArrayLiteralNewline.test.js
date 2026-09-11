import { RuleTester } from 'eslint';
import arrayLiteralNewlineRule from '../../../eslint/rules/array-literal-newline.js';

// RuleTester drives its own describe/it blocks (vitest's globals satisfy its Mocha-style interface);
// wrapping `.run()` in a vitest `it()` throws "Calling the suite function inside test function".
const ruleTester = new RuleTester({
   languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
   },
});

ruleTester.run('titan/array-literal-newline', arrayLiteralNewlineRule, {
   valid: [
      'const a = [1];',
      `const b = [
   1,
   2,
];`,
      'const { c, d } = obj;',
      'const [e, f] = arr;',
   ],
   invalid: [
      {
         code: 'const g = [1, 2];',
         output: `const g = [
1,
 2
];`,
         errors: [
            { messageId: 'missingOpeningBreak' },
            { messageId: 'missingElementBreak' },
            { messageId: 'missingClosingBreak' },
         ],
      },
      {
         code: 'const h = [[1, 2], [3, 4]];',
         output: `const h = [
[
1,
 2
],
 [
3,
 4
]
];`,
         errors: [
            { messageId: 'missingOpeningBreak' },
            { messageId: 'missingOpeningBreak' },
            { messageId: 'missingElementBreak' },
            { messageId: 'missingClosingBreak' },
            { messageId: 'missingElementBreak' },
            { messageId: 'missingOpeningBreak' },
            { messageId: 'missingElementBreak' },
            { messageId: 'missingClosingBreak' },
            { messageId: 'missingClosingBreak' },
         ],
      },
   ],
});
