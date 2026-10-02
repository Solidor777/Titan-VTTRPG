import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import maskSource from './helpers/maskSource.js';

// Every e2e test of a document runs on documents made through real Foundry user flows, and a mid-test change goes
// through the control a user would use (`.claude/claude.md`, "Tests use genuine live documents"). This guard scans the
// e2e sources for the calls that make or change a document through the API instead, or fake a user gesture.
//
// Scan 1 covers `tests/e2e/**` and `tests/shared/**`: document creation, embedded writes, imports, synthetic drops,
// source-string evaluation and sort writes. Scan 2 covers `tests/e2e/**` only: `.update(` and the `CharacterDataModel`
// action methods (`.system.request…(`, `.system.roll…(`, …), each permitted only where it matches an entry of
// `tests/e2e/direct-updates.allowlist.json` (a field that no sheet, HUD, tracker or tray control edits). In
// `global-teardown.js` and `registry.js`, the suite's own cleanup, a match whose text contains `delete` is exempt; of
// the patterns here only `.system.delete…(` can produce one, since no other pattern names a deletion (`.delete(`,
// `deleteEmbeddedDocuments(` and `deleteCompendium(` are not banned anywhere).
//
// Until the rewrite's Phase 6 the offender set must equal `tests/e2e/burn-down.json` exactly (one entry per offending
// call, keyed by file, matched text and source line, so an unrelated edit that shifts line numbers changes nothing).
// Each phase removes the entries of the files it rewrites; Phase 6 deletes the list, after which the set must be empty.
//
// Known limits of the scan: comments are skipped, string contents are not (a banned call quoted in a string is
// flagged), and the masking limits of `helpers/maskSource.js` apply (a regular-expression literal is not recognized).

/** @type {string} The repository's `tests` directory. */
const TESTS_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** @type {string} The e2e test directory. */
const E2E_DIRECTORY = path.join(TESTS_DIRECTORY, 'e2e');

/** @type {string} The shared test-helper directory. */
const SHARED_DIRECTORY = path.join(TESTS_DIRECTORY, 'shared');

/** @type {string} The burn-down list: the offenders that remain until the phase that rewrites their file. */
const BURN_DOWN_PATH = path.join(E2E_DIRECTORY, 'burn-down.json');

/** @type {string} The permitted direct updates: `{ file, pattern, field, reason }` per field with no control. */
const DIRECT_UPDATES_PATH = path.join(E2E_DIRECTORY, 'direct-updates.allowlist.json');

/** @type {string} The current rewrite phase, shared with the unit fake-document guard. */
const PHASE_PATH = path.join(TESTS_DIRECTORY, 'unit', 'phase.json');

/** @type {number} The last phase in which the burn-down list may exist; it is deleted in this phase. */
const BURN_DOWN_LAST_PHASE = 6;

/** @type {string[]} The cleanup sources, relative to `tests`, whose matches naming `delete` are exempt. */
const DELETION_SOURCES = [
   'e2e/global-teardown.js',
   'e2e/registry.js',
];

/**
 * Builds the regular expression for a literal call pattern, allowing whitespace before an opening parenthesis.
 * @param {string} literal - The literal text, such as `Actor.create(`.
 * @returns {RegExp} A global regular expression matching the literal.
 */
function literalPattern(literal) {
   return new RegExp(literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\($/, '\\s*\\('), 'g');
}

/** @type {RegExp[]} Scan 1: calls that make a document, write embedded data, or fake a user gesture. */
const CREATION_PATTERNS = [
   'Actor.create(',
   'Item.create(',
   'Scene.create(',
   'Combat.create(',
   'ChatMessage.create(',
   'ActiveEffect.create(',
   'Folder.create(',
   'Adventure.create(',
   'Macro.create(',
   '.createDocuments(',
   'createEmbeddedDocuments(',
   'updateEmbeddedDocuments(',
   'getTokenDocument(',
   'toggleStatusEffect(',
   '.import(',
   'importFromJSON(',
   'new DataTransfer(',
   'keepId',
   'new Function(',
   'performIntegerSort(',
].map(literalPattern).concat([
   // The leading dot names the API (`CompendiumCollection.createCompendium(`), so the flow helper of the same name
   // (`createCompendium(page, …)`, which drives the Compendium tab's create dialog) is not flagged.
   /\.\s*createCompendium\s*\(/g,
   // `new DragEvent('drop'`, in any quote style.
   /new\s+DragEvent\s*\(\s*(['"`])drop\1/g,
   // A document class reached through an alias (`cls.create(`, `getDocumentClass('Actor').create(`). The named classes
   // above already cover their own receivers, and `Object.create(` makes no document.
   new RegExp(`(?<!(?:${[
      'Actor',
      'Item',
      'Scene',
      'Combat',
      'ChatMessage',
      'ActiveEffect',
      'Folder',
      'Adventure',
      'Macro',
      'Object',
   ].join('|')}))\\.\\s*create\\s*\\(`, 'g'),
]);

/** @type {RegExp[]} Scan 2 (e2e only): document updates and `CharacterDataModel` actions called directly. */
const EDIT_PATTERNS = [
   /\.\s*update\s*\(/g,
   new RegExp(`\\.system\\??\\.(?:${[
      'request',
      'roll',
      'apply',
      'spend',
      'equip',
      'unEquip',
      'onTurn',
      'shortRest',
      'longRest',
      'removeCombatEffects',
      'toggleInspiration',
      'add',
      'move',
      'delete',
   ].join('|')})\\w*\\s*\\(`, 'g'),
];

/**
 * @typedef {object} Offender
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {string} match - The matched text, whitespace collapsed.
 * @property {string} source - The trimmed source line the match starts on.
 */

/**
 * @typedef {object} DirectUpdate
 * @property {string} file - The e2e source path relative to `tests`, with forward slashes.
 * @property {string} pattern - A regular expression the permitted site's source line matches.
 * @property {string} field - The document field the site writes.
 * @property {string} reason - Why no control can make the change.
 */

/**
 * Finds the banned calls in one source.
 * @param {string} file - The source path relative to `tests`, with forward slashes.
 * @param {string} source - The source text.
 * @returns {(Offender & {line: number})[]} One entry per banned call, with the 1-based line it starts on.
 */
function findOffenders(file, source) {
   /** @type {string} The source with its comments masked (strings kept, so a call built in a string is found). */
   const masked = maskSource(source);
   /** @type {string[]} The source lines. */
   const lines = source.split('\n');
   /** @type {RegExp[]} The patterns that apply to this source. */
   const patterns = file.startsWith('e2e/')
      ? [
         ...CREATION_PATTERNS,
         ...EDIT_PATTERNS,
      ]
      : CREATION_PATTERNS;

   /** @type {(Offender & {line: number})[]} The banned calls found. */
   const found = [];
   for (const regex of patterns) {
      for (const match of masked.matchAll(regex)) {
         /** @type {string} The matched text, whitespace collapsed. */
         const text = match[0].replace(/\s+/g, ' ');
         if (DELETION_SOURCES.includes(file) && /delete/i.test(text)) {
            continue;
         }

         /** @type {number} The 1-based line the match starts on. */
         const line = source.slice(0, match.index).split('\n').length;
         found.push({
            file,
            match: text,
            source: lines[line - 1].trim(),
            line,
         });
      }
   }
   return found;
}

/**
 * Removes the offenders a direct-update allowlist entry permits: scan-2 matches in the entry's file whose source line
 * matches the entry's pattern.
 * @param {(Offender & {line: number})[]} offenders - The offenders found.
 * @param {DirectUpdate[]} allowlist - The permitted direct updates.
 * @returns {{offenders: (Offender & {line: number})[], unused: DirectUpdate[]}} The offenders left and the allowlist
 * entries that permitted nothing.
 */
function applyDirectUpdates(offenders, allowlist) {
   /** @type {Set<DirectUpdate>} The allowlist entries that permitted at least one site. */
   const used = new Set();
   /** @type {(Offender & {line: number})[]} The offenders no entry permits. */
   const remaining = offenders.filter((offender) => {
      /** @type {boolean} Whether the offender is a scan-2 match. */
      const isEdit = EDIT_PATTERNS.some((regex) => new RegExp(`^${regex.source}$`).test(offender.match));
      /** @type {DirectUpdate | undefined} The entry permitting the offender. */
      const entry = isEdit
         ? allowlist.find(({ file, pattern }) => file === offender.file && new RegExp(pattern).test(offender.source))
         : undefined;
      if (entry) {
         used.add(entry);
      }
      return !entry;
   });
   return {
      offenders: remaining,
      unused: allowlist.filter((entry) => !used.has(entry)),
   };
}

/**
 * Orders offenders by file, matched text and source line, for a stable comparison.
 * @param {Offender} first - The first offender.
 * @param {Offender} second - The second offender.
 * @returns {number} Negative, zero or positive, as `Array#sort` expects.
 */
function compareOffenders(first, second) {
   return first.file.localeCompare(second.file) || first.match.localeCompare(second.match)
      || first.source.localeCompare(second.source);
}

/**
 * Lists the entries of one offender multiset that the other lacks, counting duplicates.
 * @param {Offender[]} from - The multiset to take entries from.
 * @param {Offender[]} without - The multiset whose entries cancel them.
 * @returns {Offender[]} The entries of `from` left after cancelling each entry of `without` once.
 */
function subtractOffenders(from, without) {
   /** @type {Map<string, number>} The remaining count of each entry of `without`, keyed by its JSON. */
   const counts = new Map();
   for (const entry of without) {
      /** @type {string} The entry's key. */
      const key = JSON.stringify([
         entry.file,
         entry.match,
         entry.source,
      ]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
   }
   return from.filter((entry) => {
      /** @type {string} The entry's key. */
      const key = JSON.stringify([
         entry.file,
         entry.match,
         entry.source,
      ]);
      if (counts.get(key) > 0) {
         counts.set(key, counts.get(key) - 1);
         return false;
      }
      return true;
   });
}

/**
 * Lists the `.js` and `.mjs` sources under a directory, relative to `tests`, with forward slashes.
 * @param {string} directory - The directory to list.
 * @returns {string[]} The source paths.
 */
function listSources(directory) {
   return readdirSync(directory, { recursive: true })
      .map((entry) => String(entry))
      .filter((entry) => /\.m?js$/.test(entry))
      .map((entry) => path.relative(TESTS_DIRECTORY, path.join(directory, entry)).replace(/\\/g, '/'));
}

describe('e2e real documents', () => {
   it('flags each banned call once, and skips comments and other calls', () => {
      /** @type {[string, string][]} Each source with the one match it must yield. */
      const flagged = [
         [
            'await Actor.create({ name: \'X\', type: \'player\' });',
            'Actor.create(',
         ],
         [
            'const cls = Item; await cls.create(data);',
            '.create(',
         ],
         [
            'await foundry.documents.collections.CompendiumCollection.createCompendium({ label });',
            '.createCompendium(',
         ],
         [
            'tray.dispatchEvent(new DragEvent("drop", { dataTransfer }));',
            'new DragEvent("drop"',
         ],
         [
            'await actor.createEmbeddedDocuments(\'Item\', [data]);',
            'createEmbeddedDocuments(',
         ],
         [
            'await adventure.import({ dialog: false });',
            '.import(',
         ],
         [
            'await pack.importDocument(item, { keepId: true });',
            'keepId',
         ],
         [
            'await actor?.update({ name: \'Y\' });',
            '.update(',
         ],
         [
            'await actor.system.requestItemDeletion(id);',
            '.system.requestItemDeletion(',
         ],
         [
            'await actor.system?.rollAttributeCheck({});',
            '.system?.rollAttributeCheck(',
         ],
      ];
      for (const [source, match] of flagged) {
         expect.soft(findOffenders('e2e/x.spec.js', source).map((offender) => offender.match), source)
            .toEqual([match]);
      }

      /** @type {string[]} Sources with no banned call. */
      const clean = [
         '// await Actor.create({ name: \'X\' });',
         '/* actor.update({}) */',
         'await createCompendium(page, { label: \'E2E Pack\', type: \'Item\' });',
         'const proto = Object.create(null);',
         'window.dispatchEvent(new DragEvent(\'dragend\'));',
         'await actor.delete();',
         'await game.settings.set(\'titan\', \'key\', 1);',
         'const url = \'http://localhost:30000\'; await actor.sheet.render(true);',
      ];
      for (const source of clean) {
         expect.soft(findOffenders('e2e/x.spec.js', source), source).toEqual([]);
      }
   });

   it('applies the edit scan to tests/e2e only, and spares deletions in the cleanup sources', () => {
      expect(findOffenders('shared/x.js', 'await actor.update({});')).toEqual([]);
      expect(findOffenders('shared/x.js', 'await Actor.create({});')).toHaveLength(1);
      expect(findOffenders('e2e/global-teardown.js', 'await actor.system.deleteItem(id);')).toEqual([]);
      expect(findOffenders('e2e/global-teardown.js', 'await actor.update({});')).toHaveLength(1);
   });

   it('permits a scan-2 site that matches a direct-update allowlist entry, and reports an unused entry', () => {
      /** @type {(Offender & {line: number})[]} A direct update and a creation on the same source line. */
      const offenders = findOffenders('e2e/x.spec.js', 'await Actor.create({}); await token.update({ x: 1 });');
      /** @type {DirectUpdate[]} One entry permitting the update, one permitting nothing. */
      const allowlist = [
         {
            file: 'e2e/x.spec.js',
            pattern: 'token\\.update\\(\\{ x:',
            field: 'x',
            reason: 'synthetic',
         },
         {
            file: 'e2e/y.spec.js',
            pattern: 'update',
            field: 'y',
            reason: 'synthetic',
         },
      ];
      /** @type {{offenders: (Offender & {line: number})[], unused: DirectUpdate[]}} What is left. */
      const result = applyDirectUpdates(offenders, allowlist);
      expect(result.offenders.map((offender) => offender.match)).toEqual(['Actor.create(']);
      expect(result.unused).toEqual([allowlist[1]]);
   });

   it('reports the line a match starts on', () => {
      expect(findOffenders('e2e/x.spec.js', 'a;\nb;\nawait Actor.create({});')[0].line).toBe(3);
   });

   it('finds exactly the burn-down offenders under tests/e2e and tests/shared', () => {
      /** @type {string[]} The scanned sources, relative to `tests`. */
      const sources = [
         ...listSources(E2E_DIRECTORY),
         ...listSources(SHARED_DIRECTORY),
      ];
      expect(sources).toContain('e2e/fixtures.js');
      expect(sources).toContain('e2e/logic/conditions.spec.js');

      /** @type {DirectUpdate[]} The permitted direct updates. */
      const directUpdates = JSON.parse(readFileSync(DIRECT_UPDATES_PATH, 'utf8'));
      for (const entry of directUpdates) {
         expect.soft(
            [
               'file',
               'pattern',
               'field',
               'reason',
            ].every((key) => typeof entry[key] === 'string' && entry[key].length > 0),
            `direct-update entry needs a non-empty file, pattern, field and reason: ${JSON.stringify(entry)}`,
         ).toBe(true);
      }

      /** @type {{offenders: (Offender & {line: number})[], unused: DirectUpdate[]}} The offenders left. */
      const { offenders, unused } = applyDirectUpdates(sources.flatMap((file) => findOffenders(
         file,
         readFileSync(path.join(TESTS_DIRECTORY, file), 'utf8'),
      )), directUpdates);
      expect(unused, `direct-update entries that permit no site:\n${JSON.stringify(unused, null, 3)}`).toEqual([]);

      /** @type {number} The current rewrite phase. */
      const { phase } = JSON.parse(readFileSync(PHASE_PATH, 'utf8'));
      /** @type {Offender[]} The burn-down list, or none once it is deleted. */
      const burnDown = existsSync(BURN_DOWN_PATH) ? JSON.parse(readFileSync(BURN_DOWN_PATH, 'utf8')) : [];
      expect(
         phase > BURN_DOWN_LAST_PHASE && existsSync(BURN_DOWN_PATH),
         `tests/e2e/burn-down.json must be deleted by the end of phase ${BURN_DOWN_LAST_PHASE}`,
      ).toBe(false);

      /** @type {Offender[]} The offenders found, without line numbers. */
      const found = offenders.map(({ file, match, source }) => ({
         file,
         match,
         source,
      }));
      /** @type {(Offender & {line: number})[]} Offenders the burn-down list does not hold. */
      const unexpected = subtractOffenders(offenders, burnDown);
      /** @type {Offender[]} Burn-down entries no longer found. */
      const resolved = subtractOffenders(burnDown, found);
      expect.soft(
         unexpected.map(({ file, line, source }) => `${file}:${line} — ${source}`),
         'banned calls not in tests/e2e/burn-down.json (make the document or the change through the real flow):\n'
            + JSON.stringify(unexpected.map(({ file, match, source }) => ({
               file,
               match,
               source,
            })).sort(compareOffenders), null, 3),
      ).toEqual([]);
      expect.soft(
         resolved,
         'tests/e2e/burn-down.json entries no longer found (delete them from the list):\n'
            + JSON.stringify(resolved, null, 3),
      ).toEqual([]);
   });
});
