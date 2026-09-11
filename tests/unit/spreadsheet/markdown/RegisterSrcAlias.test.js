import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} The repository root, five directories above this test file. */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

describe('registerSrcAlias', () => {
   it('resolves a ~/ import to the matching src/ module', () => {
      const output = execFileSync(
         'node',
         [
            '--import',
            './scripts/lib/registerSrcAlias.mjs',
            '-e',
            "import('~/spreadsheet/codec/Workbook.js').then(m => console.log(m.FIXED_COLUMNS.length))",
         ],
         {
            cwd: repoRoot,
            encoding: 'utf8',
         },
      );

      expect(output.trim()).toBe('7');
   });
});
