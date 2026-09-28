import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Every write a check dialog makes to its Check Options goes through the tracked setter (`setCheckOption`, from
// `createCheckOptionSetter` in ReinitializeCheckOptions.js), which records the write as a user edit. A direct bind or
// assignment bypasses that record, so the rebuild re-derives the field and discards the user's value. This guard
// fails on any such write in the dialog components.

/** @type {string} The repository's `src/check` directory. */
const CHECK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../src/check');

/** @type {string} The one component allowed to assign the whole store: the shell writing the rebuilt options. */
const REBUILD_WRITER = path.join('dialog', 'CheckDialogShell.svelte');

/**
 * The forbidden write forms and what each catches.
 * @type {{name: string, pattern: RegExp, exempt?: string}[]}
 */
const FORBIDDEN_WRITES = [
   {
      name: 'a two-way bind to a Check Options field',
      pattern: /bind:\w+=\{\s*\$checkOptions\b/,
   },
   {
      name: 'an assignment to a Check Options field',
      pattern: /\$checkOptions(?:\s*(?:\.\s*\w+|\[[^\]]*\]))+\s*(?:[+\-*/%]?=(?!=)|\+\+|--)/,
   },
   {
      name: 'a store method write',
      pattern: /\bcheckOptions\s*\.\s*(?:set|update)\s*\(/,
   },
   {
      exempt: REBUILD_WRITER,
      name: 'an assignment to the whole Check Options store',
      pattern: /\$checkOptions\s*=(?!=)/,
   },
];

/**
 * Lists the Svelte components under every `dialog` directory of `src/check`.
 * @returns {string[]} The component paths relative to `src/check`.
 */
function listDialogComponents() {
   return readdirSync(CHECK_DIR, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => entry.endsWith('.svelte') && entry.split(path.sep).includes('dialog'));
}

/**
 * Finds the forbidden Check Options writes in a component's source.
 * @param {string} relativePath - The component path relative to `src/check`.
 * @param {string} source - The component source.
 * @returns {string[]} One `path:line — kind` entry per forbidden write.
 */
function findForbiddenWrites(relativePath, source) {
   /** @type {string[]} The forbidden writes found. */
   const found = [];
   source.split('\n').forEach((line, index) => {
      for (const { exempt, name, pattern } of FORBIDDEN_WRITES) {
         if (exempt !== relativePath && pattern.test(line)) {
            found.push(`${relativePath}:${index + 1} — ${name}: ${line.trim()}`);
         }
      }
   });
   return found;
}

describe('check dialog Check Options writes', () => {
   it('finds the dialog components to scan', () => {
      /** @type {string[]} The scanned components. */
      const components = listDialogComponents();
      expect(components).toContain(path.join('dialog', 'CheckDialogSkillField.svelte'));
      expect(components).toContain(
         path.join('types', 'resistance-check', 'dialog', 'ResistanceCheckDialogResistanceField.svelte'),
      );
   });

   it('flags every forbidden write form', () => {
      expect(findForbiddenWrites('x.svelte', 'bind:value={$checkOptions.skill}')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', 'bind:checked={ $checkOptions.doubleTraining }')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions.situations = [];')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions[\'diceMod\'] += 1;')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', 'checkOptions.update((options) => options);')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions = next;')).toHaveLength(1);
      expect(findForbiddenWrites(REBUILD_WRITER, '$checkOptions = next;')).toHaveLength(0);
      expect(findForbiddenWrites('x.svelte', 'if ($checkOptions.type === \'melee\') {')).toHaveLength(0);
      expect(findForbiddenWrites('x.svelte', '() => $checkOptions.skill,')).toHaveLength(0);
   });

   it('writes Check Options only through the tracked setter', () => {
      /** @type {string[]} Every forbidden write in the dialog components. */
      const found = listDialogComponents().flatMap((relativePath) => findForbiddenWrites(
         relativePath,
         readFileSync(path.join(CHECK_DIR, relativePath), 'utf8'),
      ));
      expect(found, found.join('\n')).toEqual([]);
   });
});
