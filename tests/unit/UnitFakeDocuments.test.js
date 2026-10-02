import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// A unit test may use synthetic data only for UI elements, document-agnostic operations, intermediate computations on
// given inputs, and tests that invalid data is rejected or handled (`.claude/claude.md`, "Tests use genuine live
// documents"). A fake document that accepts writes stands in for a live document, so this guard finds every unit
// source that builds a fake write surface and requires it to be listed in `tests/unit/fake-documents.allowlist.json`.
//
// A fake write surface is a document write method bound by the test — an object-literal key or method, a member
// assignment, or a `vi.spyOn` — named `create`, `createDocuments`, `update`, `delete`, `createEmbeddedDocuments`,
// `deleteEmbeddedDocuments`, `updateEmbeddedDocuments`, `createEffects`, `updateEffects`, `deleteEffects` or
// `deleteItems`, or an object-literal `_source` key.
//
// The allowlist has two kinds. A permitted entry names the clause of the rule that allows the file's fakes. A burn-down
// entry names the rewrite phase that deletes the file; the guard reads the current phase from `tests/unit/phase.json`
// (bumped in each phase's first commit) and fails once the file outlives its phase. The guard also fails on a matching
// file that is not listed, and on a listed file that is gone or no longer matches.
//
// Known limits of the scan: comments are skipped, string contents are not; a regular-expression literal containing a
// quote character is read as the start of a string, and one containing `//` or `/*` is read as a comment.

/** @type {string} The unit test directory. */
const UNIT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} The allowlist of unit sources that build fake write surfaces. */
const ALLOWLIST_PATH = path.join(UNIT_DIRECTORY, 'fake-documents.allowlist.json');

/** @type {string} The current rewrite phase. */
const PHASE_PATH = path.join(UNIT_DIRECTORY, 'phase.json');

/** @type {string} This guard's own source, whose test cases quote fake write surfaces. */
const GUARD_SOURCE = 'UnitFakeDocuments.test.js';

/** @type {string} The document write methods a fake may not bind, as a regular-expression alternation. */
const WRITE_KEYS = [
   'createEmbeddedDocuments',
   'deleteEmbeddedDocuments',
   'updateEmbeddedDocuments',
   'createDocuments',
   'createEffects',
   'updateEffects',
   'deleteEffects',
   'deleteItems',
   'create',
   'update',
   'delete',
].join('|');

/**
 * @typedef {object} FakeSurfacePattern
 * @property {string} kind - What the pattern finds.
 * @property {RegExp} regex - The global regular expression that finds it.
 */

/** @type {FakeSurfacePattern[]} The shapes of a fake write surface. */
const FAKE_SURFACE_PATTERNS = [
   {
      // A key in an object literal: it follows the literal's `{` or a `,`, so a ternary's `? update :` and a
      // `case 'update':` label are not keys.
      kind: 'object-literal key',
      regex: new RegExp(`(?<=[{,]\\s*)(['"]?)(?:${WRITE_KEYS}|_source)\\1\\s*:(?!:)`, 'g'),
   },
   {
      // A method in an object literal; the guard confirms a body follows the parameter list.
      kind: 'object-literal method',
      regex: new RegExp(`(?<=[{,]\\s*)(?:async\\s+)?(?:\\*\\s*)?(?:${WRITE_KEYS})\\s*\\(`, 'g'),
   },
   {
      kind: 'member assignment',
      regex: new RegExp(`(?:\\.\\s*(?:${WRITE_KEYS})|\\[\\s*(['"])(?:${WRITE_KEYS})\\1\\s*\\])\\s*=(?![=>])`, 'g'),
   },
   {
      kind: 'vi.spyOn',
      regex: new RegExp(`\\bvi\\s*\\.\\s*spyOn\\s*\\([^,]+,\\s*(['"\`])(?:${WRITE_KEYS})\\1`, 'g'),
   },
];

/**
 * @typedef {object} PermittedEntry
 * @property {string} file - The unit source path relative to `tests/unit`, with forward slashes.
 * @property {string} clause - The clause of the rule that allows the file's fakes.
 */

/**
 * @typedef {object} BurnDownEntry
 * @property {string} file - The unit source path relative to `tests/unit`, with forward slashes.
 * @property {number} removedInPhase - The rewrite phase that deletes the file.
 */

/**
 * @typedef {object} FakeDocumentsAllowlist
 * @property {PermittedEntry[]} permitted - Files whose fakes a clause of the rule allows.
 * @property {BurnDownEntry[]} burnDown - Files that remain until the phase that deletes them.
 */

/** @type {string[]} The characters that open a string or template literal. */
const QUOTES = [
   '\'',
   '"',
   '`',
];

/**
 * Masks the comments of a source as spaces, keeping string contents and every index and line break.
 * @param {string} source - The source text.
 * @returns {string} The masked text, the same length as the source.
 */
function maskComments(source) {
   /** @type {string[]} The masked characters. */
   const out = [...source];
   /** @type {number} The scan position. */
   let index = 0;
   while (index < source.length) {
      /** @type {string} The two characters at the scan position. */
      const pair = source.slice(index, index + 2);
      if (pair === '//' || pair === '/*') {
         /** @type {number} The index of the line break or block close ending the comment; -1 if none. */
         const terminator = source.indexOf(pair === '//' ? '\n' : '*/', index + 2);
         /** @type {number} The index just past the comment (a line comment keeps its line break). */
         const end = terminator === -1 ? source.length : terminator + (pair === '//' ? 0 : 2);
         for (let position = index; position < end; position++) {
            if (out[position] !== '\n') {
               out[position] = ' ';
            }
         }
         index = end;
      }
      else if (QUOTES.includes(source[index])) {
         /** @type {string} The quote that closes the string. */
         const quote = source[index];
         index++;
         while (index < source.length && source[index] !== quote) {
            index += source[index] === '\\' ? 2 : 1;
         }
         index++;
      }
      else {
         index++;
      }
   }
   return out.join('');
}

/**
 * Finds the index of the parenthesis that closes the group opened at a position.
 * @param {string} masked - The masked source.
 * @param {number} openIndex - The index of a `(`.
 * @returns {number} The index of its closing parenthesis, or the source length when unbalanced.
 */
function findClosing(masked, openIndex) {
   /** @type {number} The nesting depth. */
   let depth = 0;
   for (let index = openIndex; index < masked.length; index++) {
      if (masked[index] === '(') {
         depth++;
      }
      else if (masked[index] === ')') {
         depth--;
         if (depth === 0) {
            return index;
         }
      }
   }
   return masked.length;
}

/**
 * Finds the fake write surfaces a source builds.
 * @param {string} source - The source text.
 * @returns {string[]} One `line — text` entry per fake write surface.
 */
function findFakeSurfaces(source) {
   /** @type {string} The source with its comments masked. */
   const masked = maskComments(source);

   /** @type {string[]} The fake write surfaces found. */
   const found = [];
   for (const { kind, regex } of FAKE_SURFACE_PATTERNS) {
      for (const match of masked.matchAll(regex)) {
         if (kind === 'object-literal method') {
            /** @type {number} The index of the parenthesis closing the parameter list. */
            const close = findClosing(masked, match.index + match[0].length - 1);
            if (!/^\s*\{/.test(masked.slice(close + 1))) {
               continue;
            }
         }

         /** @type {number} The 1-based line the match starts on. */
         const line = source.slice(0, match.index).split('\n').length;
         found.push(`${line} — ${match[0].replace(/\s+/g, ' ')}`);
      }
   }
   return found;
}

describe('unit fake documents', () => {
   it('flags each fake write surface', () => {
      /** @type {string[]} Sources that each build one fake write surface. */
      const fakes = [
         'const actor = { update: vi.fn() };',
         'const pack = {\n   id: \'p\',\n   \'delete\': async () => {},\n};',
         'const target = { name: \'t\', async createEffects(data) { return data; } };',
         'const doc = { deleteItems(ids) {\n   return ids;\n} };',
         'target.deleteEffects = async (ids) => ids;',
         'actor[\'createEmbeddedDocuments\'] = vi.fn();',
         'vi.spyOn(actor, \'update\').mockResolvedValue(actor);',
         'const stored = { id: \'a\', _source: { items: [] } };',
         'globalThis.Macro = { create: async (data) => data };',
      ];
      for (const source of fakes) {
         expect.soft(findFakeSurfaces(source), source).toHaveLength(1);
      }
   });

   it('passes calls, reads, ternaries, switch labels and comments', () => {
      /** @type {string[]} Sources that build no fake write surface. */
      const others = [
         'await actor.update({ name: \'x\' });',
         'expect(actor.update).toHaveBeenCalledWith({});',
         'const model = Object.create(CharacterDataModel.prototype);',
         'const value = flag ? update : other;',
         'switch (kind) {\n   case \'update\':\n      break;\n}',
         '// const fake = { update: vi.fn() };',
         'delete globalThis.game;',
         'expect([a, create({})]).toEqual([]);',
         'if (actor._source.items) {\n   x();\n}',
         'const names = [\'createEffects\', \'deleteItems\'];',
      ];
      for (const source of others) {
         expect.soft(findFakeSurfaces(source), source).toEqual([]);
      }
   });

   it('lists every unit source that builds a fake write surface, and nothing else', () => {
      /** @type {FakeDocumentsAllowlist} The allowlist. */
      const { permitted, burnDown } = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
      /** @type {number} The current rewrite phase. */
      const { phase } = JSON.parse(readFileSync(PHASE_PATH, 'utf8'));
      expect(Number.isInteger(phase), 'tests/unit/phase.json holds an integer phase').toBe(true);

      for (const entry of permitted) {
         expect.soft(
            typeof entry.clause === 'string' && entry.clause.length > 0,
            `permitted entry needs its clause: ${entry.file}`,
         ).toBe(true);
      }
      for (const entry of burnDown) {
         expect.soft(Number.isInteger(entry.removedInPhase), `burn-down entry needs its phase: ${entry.file}`)
            .toBe(true);
      }

      /** @type {string[]} The unit sources, relative to `tests/unit`, with forward slashes. */
      const sources = readdirSync(UNIT_DIRECTORY, { recursive: true })
         .map((entry) => String(entry).replace(/\\/g, '/'))
         .filter((entry) => /\.m?js$/.test(entry) && entry !== GUARD_SOURCE);
      expect(sources).toContain('E2eContextMenuClicks.test.js');
      expect(sources).toContain('check/check-send-to-chat.test.js');

      /** @type {Map<string, string[]>} The fake write surfaces of each matching source. */
      const matching = new Map();
      for (const file of sources) {
         /** @type {string[]} The source's fake write surfaces. */
         const surfaces = findFakeSurfaces(readFileSync(path.join(UNIT_DIRECTORY, file), 'utf8'));
         if (surfaces.length > 0) {
            matching.set(file, surfaces);
         }
      }

      /** @type {Set<string>} Every listed file. */
      const listed = new Set([
         ...permitted,
         ...burnDown,
      ].map((entry) => entry.file));
      /** @type {string[]} Matching files the allowlist does not name. */
      const unlisted = [...matching.keys()].filter((file) => !listed.has(file));
      expect.soft(
         unlisted,
         `unit sources with an unlisted fake write surface (use real inputs, or list the file with its clause):\n${
            unlisted.map((file) => `${file}: ${matching.get(file).join('; ')}`).join('\n')}`,
      ).toEqual([]);

      /** @type {string[]} Listed files that are gone. */
      const gone = [...listed].filter((file) => !existsSync(path.join(UNIT_DIRECTORY, file)));
      expect.soft(gone, 'listed unit sources that are gone (delete their entries)').toEqual([]);

      /** @type {string[]} Listed files that still exist but build no fake write surface. */
      const stale = [...listed].filter((file) => !gone.includes(file) && !matching.has(file));
      expect.soft(stale, 'listed unit sources that no longer build a fake write surface (delete their entries)')
         .toEqual([]);

      /** @type {string[]} Burn-down files that outlived their phase. */
      const overdue = burnDown
         .filter((entry) => phase > entry.removedInPhase && existsSync(path.join(UNIT_DIRECTORY, entry.file)))
         .map((entry) => `${entry.file} (removed in phase ${entry.removedInPhase}; now phase ${phase})`);
      expect.soft(overdue, 'burn-down unit sources that outlived their phase (delete the file and its entry)')
         .toEqual([]);
   });
});
