import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// A check dialog's components receive a read-only, frozen view of the Check Options (CheckDialogShell.svelte), so a
// write outside the tracked setter throws by construction. This scan is the backstop: it reads every source under a
// `dialog` directory of `src/check` whole (so a write split across lines is still one match) and fails on any write
// form through the `'checkOptions'` store, under its own name or an alias bound from `getContext('checkOptions')`.

/** @type {string} The repository's `src/check` directory. */
const CHECK_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../src/check');

/** @type {string[]} The sources allowed to write the store: the shell that owns it and the tracked-setter module. */
const EXEMPT_SOURCES = [
   path.join('dialog', 'CheckDialogShell.svelte'),
   path.join('dialog', 'ReinitializeCheckOptions.js'),
];

/** @type {string} An assignment operator: plain, compound, or logical (never a comparison). */
const ASSIGNMENT = String.raw`(?:\*\*|<<|>>>?|\?\?|&&|\|\||[-+*/%&|^])?=(?!=)`;

/** @type {string} A property path: dotted, optionally chained, or bracketed segments, across line breaks. */
const PATH_SEGMENT = String.raw`(?:\s*\??\.\s*\w+|\s*\[[^\]]*\])`;

/** @type {string} The array methods that mutate in place. */
const MUTATING_METHODS = 'push|pop|shift|unshift|splice|sort|reverse|fill|copyWithin';

/**
 * Builds the forbidden write forms through one store name and what each catches.
 * @param {string} name - The store's local name (`checkOptions` or an alias bound from its context).
 * @returns {{name: string, pattern: RegExp}[]} The write forms, each a global regular expression.
 */
function writeForms(name) {
   return [
      {
         name: 'a two-way bind to a Check Options field',
         pattern: new RegExp(String.raw`bind:\w+\s*=\s*\{\s*\$${name}\b`, 'g'),
      },
      {
         name: 'an assignment to a Check Options field',
         pattern: new RegExp(String.raw`\$${name}${PATH_SEGMENT}+\s*(?:${ASSIGNMENT}|\+\+|--)`, 'g'),
      },
      {
         name: 'an increment or decrement of a Check Options field',
         pattern: new RegExp(String.raw`(?:\+\+|--)\s*\$${name}\b`, 'g'),
      },
      {
         name: 'an in-place array mutation',
         pattern: new RegExp(String.raw`\$${name}${PATH_SEGMENT}*\s*\??\.\s*(?:${MUTATING_METHODS})\s*\(`, 'g'),
      },
      {
         name: 'an Object.assign into the options',
         pattern: new RegExp(String.raw`Object\s*\.\s*assign\s*\(\s*\$${name}\b`, 'g'),
      },
      {
         name: 'a store method write',
         pattern: new RegExp(String.raw`(?<![\w$])${name}\s*\??\.\s*(?:set|update)\s*\(`, 'g'),
      },
      {
         name: 'an assignment to the whole Check Options store',
         pattern: new RegExp(String.raw`\$${name}\s*${ASSIGNMENT}`, 'g'),
      },
   ];
}

/**
 * Lists the sources under every `dialog` directory of `src/check` (`.svelte`, `.js`, and `.svelte.js`).
 * @returns {string[]} The source paths relative to `src/check`, exempt sources included.
 */
function listDialogSources() {
   return readdirSync(CHECK_DIR, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => /\.(?:svelte|js)$/.test(entry) && entry.split(path.sep).includes('dialog'));
}

/**
 * Finds the forbidden Check Options writes in a source, through the store's own name and every alias of it.
 * @param {string} relativePath - The source path relative to `src/check`.
 * @param {string} source - The source text.
 * @returns {string[]} One `path:line — kind: text` entry per forbidden write; none for an exempt source.
 */
function findForbiddenWrites(relativePath, source) {
   if (EXEMPT_SOURCES.includes(relativePath)) {
      return [];
   }

   /** @type {Set<string>} The store's local names: its own and each alias bound from its context. */
   const names = new Set(['checkOptions']);
   for (const match of source.matchAll(/(\w+)\s*=\s*getContext\(\s*(['"`])checkOptions\2\s*\)/g)) {
      names.add(match[1]);
   }

   /** @type {string[]} The forbidden writes found. */
   const found = [];
   for (const name of names) {
      for (const form of writeForms(name)) {
         for (const match of source.matchAll(form.pattern)) {
            /** @type {number} The 1-based line the write starts on. */
            const line = source.slice(0, match.index).split('\n').length;
            found.push(`${relativePath}:${line} — ${form.name}: ${match[0].replace(/\s+/g, ' ')}`);
         }
      }
   }
   return found;
}

describe('check dialog Check Options writes', () => {
   it('finds the dialog sources to scan', () => {
      /** @type {string[]} The scanned sources. */
      const sources = listDialogSources();
      expect(sources).toContain(path.join('dialog', 'CheckDialogSkillField.svelte'));
      expect(sources).toContain(path.join('dialog', 'GroupSituationalModifiers.js'));
      expect(sources).toContain(
         path.join('types', 'resistance-check', 'dialog', 'ResistanceCheckDialogResistanceField.svelte'),
      );
      expect(sources).toContain(path.join('types', 'attack-check', 'dialog', 'AttackCheckDialog.js'));
   });

   it('flags every forbidden write form', () => {
      expect(findForbiddenWrites('x.svelte', 'bind:value={$checkOptions.skill}')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', 'bind:checked={ $checkOptions.doubleTraining }')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions.situations = [];')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions[\'diceMod\'] += 1;')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', 'checkOptions.update((options) => options);')).toHaveLength(1);
      expect(findForbiddenWrites('x.svelte', '$checkOptions = next;')).toHaveLength(1);
      expect(findForbiddenWrites(EXEMPT_SOURCES[0], '$checkOptions = next;')).toHaveLength(0);
      expect(findForbiddenWrites(EXEMPT_SOURCES[1], 'checkOptions.update((options) => options);')).toHaveLength(0);
      expect(findForbiddenWrites('x.svelte', 'if ($checkOptions.type === \'melee\') {')).toHaveLength(0);
      expect(findForbiddenWrites('x.svelte', '() => $checkOptions.skill,')).toHaveLength(0);
   });

   it('flags writes that span lines, mutate in place, use logical assignment, or go through an alias', () => {
      /** @type {string[]} Sources that each make exactly one forbidden write. */
      const writes = [
         'bind:value={\n   $checkOptions.skill\n}',
         '$checkOptions.situations.push(\'underwater\');',
         '$checkOptions.situations\n   .splice(0, 1);',
         '$checkOptions[\'situations\'].sort();',
         'Object.assign($checkOptions, { skill: \'arcana\' });',
         '$checkOptions.skill ??= \'arcana\';',
         '$checkOptions.skill ||= \'arcana\';',
         '$checkOptions.diceMod **= 2;',
         '$checkOptions.doubleTraining &&= false;',
         '++$checkOptions.diceMod;',
         'checkOptions?.update((options) => options);',
         '$checkOptions\n   .skill = \'arcana\';',
         'const store = getContext(\'checkOptions\');\nstore.set({});',
         'const store = getContext("checkOptions");\n$store.skill = \'arcana\';',
         'const store = getContext(\'checkOptions\');\nbind:checked={$store.doubleTraining}',
      ];
      for (const source of writes) {
         expect.soft(findForbiddenWrites('x.svelte', source), source).toHaveLength(1);
      }

      /** @type {string[]} Sources that only read the options. */
      const reads = [
         '$checkOptions.situations.filter((key) => key)',
         'if ($checkOptions.advantage >= 1 && $checkOptions.skill !== \'none\') {',
         'const checkOptions = getContext(\'checkOptions\');',
         'setCheckOption(\'situations\', [...$checkOptions.situations, key]);',
         'bind:value={\n   () => $checkOptions.skill,\n   (value) => setCheckOption(\'skill\', value)\n}',
      ];
      for (const source of reads) {
         expect.soft(findForbiddenWrites('x.svelte', source), source).toEqual([]);
      }
   });

   it('reports the line a multi-line write starts on', () => {
      expect(findForbiddenWrites('x.svelte', 'a\nb\n$checkOptions\n   .skill = 1;')[0]).toMatch(/^x\.svelte:3 /);
   });

   it('writes Check Options only through the tracked setter', () => {
      /** @type {string[]} Every forbidden write in the dialog sources. */
      const found = listDialogSources().flatMap((relativePath) => findForbiddenWrites(
         relativePath,
         readFileSync(path.join(CHECK_DIR, relativePath), 'utf8'),
      ));
      expect(found, found.join('\n')).toEqual([]);
   });
});
