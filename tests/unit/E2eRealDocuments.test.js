import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNodes, staticKeyName, TREE_SCAN_TIMEOUT } from './helpers/parseSource.js';

// Every e2e test of a document runs on documents made through real Foundry user flows, and a mid-test change goes
// through the control a user would use (`.claude/claude.md`, "Tests use genuine live documents"). This guard scans the
// e2e sources for the calls that make or change a document through the API instead, or fake a user gesture.
//
// The guard reads each source's syntax tree (`helpers/parseSource.js`), with the code held in its strings, and matches
// call and `new` expressions by the callee's name: an identifier, or a member's property, dotted, optional (`?.`) or a
// computed string. Scan 1 covers `tests/e2e/**` and `tests/shared/**`: document creation, embedded writes, imports,
// synthetic drops, source-string evaluation and sort writes, and any `keepId` name. Scan 2 covers `tests/e2e/**` only:
// `.update(` and the `CharacterDataModel` action methods (`.system.request…(`, `.system.roll…(`, …), each permitted
// only where it matches an entry of `tests/e2e/direct-updates.allowlist.json` (a field that no sheet, HUD, tracker or
// tray control edits). In `global-teardown.js` and `registry.js`, the suite's own cleanup, a match whose text contains
// `delete` is exempt; of the matches here only `.system.delete…(` can be one, since no other names a deletion
// (`.delete(`, `deleteEmbeddedDocuments(` and `deleteCompendium(` are not banned anywhere).
//
// Each match is written as its canonical text (`Actor.create(`, `.update(`, `.system.rollAttackCheck(`,
// `new DragEvent('drop'`), on the line where that text starts. Until the rewrite's Phase 6 the offender set must equal
// `tests/e2e/burn-down.json` exactly (one entry per offending call, keyed by file, matched text and source line, so an
// unrelated edit that shifts line numbers changes nothing). Each phase removes the entries of the files it rewrites;
// Phase 6 deletes the list, after which the set must be empty.
//
// Known limit of the scan: a callee reached through a computed name held in a variable (`actor[method](`) is not
// matched, and code held in a string is found only when the string's text alone parses.

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

/** @type {Set<string>} The document classes whose `create(` is matched under the class's own name. */
const DOCUMENT_CLASSES = new Set([
   'Actor',
   'Item',
   'Scene',
   'Combat',
   'ChatMessage',
   'ActiveEffect',
   'Folder',
   'Adventure',
   'Macro',
]);

/**
 * @type {Set<string>} Scan 1 calls matched by name, whether the callee is a bare identifier or a member, written
 * `<name>(`.
 */
const NAMED_CALLS = new Set([
   'createEmbeddedDocuments',
   'updateEmbeddedDocuments',
   'getTokenDocument',
   'toggleStatusEffect',
   'importFromJSON',
   'performIntegerSort',
]);

/**
 * @type {Set<string>} Scan 1 calls matched only as a member, written `.<name>(`. The member form of `createCompendium`
 * names the API (`CompendiumCollection.createCompendium(`), so the flow helper of the same name
 * (`createCompendium(page, …)`, which drives the Compendium tab's create dialog) is not matched.
 */
const MEMBER_CALLS = new Set([
   'createDocuments',
   'import',
   'createCompendium',
]);

/** @type {Set<string>} Scan 1 constructors, written `new <name>(`. `new DragEvent(` is matched only for a drop. */
const CONSTRUCTORS = new Set([
   'DataTransfer',
   'Function',
]);

/** @type {string} The option that keeps a document's id on import or creation, matched as any name. */
const KEEP_ID = 'keepId';

/** @type {RegExp} Scan 2: a `CharacterDataModel` action method, called on a `system` member. */
const SYSTEM_ACTION = new RegExp(`^(?:${[
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
].join('|')})\\w*$`);

/**
 * @typedef {object} Offender
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {string} match - The matched text.
 * @property {string} source - The trimmed source line the match starts on.
 */

/**
 * @typedef {object} FoundOffender
 * @property {string} file - The source path relative to `tests`, with forward slashes.
 * @property {string} match - The matched text.
 * @property {string} source - The trimmed source line the match starts on.
 * @property {number} line - The 1-based line the match starts on.
 * @property {boolean} edit - Whether the match is a scan-2 edit, which a direct-update entry may permit.
 */

/**
 * @typedef {object} DirectUpdate
 * @property {string} file - The e2e source path relative to `tests`, with forward slashes.
 * @property {string} pattern - A regular expression the permitted site's source line matches.
 * @property {string} field - The document field the site writes.
 * @property {string} reason - Why no control can make the change.
 */

/**
 * @typedef {object} NodeMatch
 * @property {string} text - The matched text.
 * @property {object} at - The node whose first line is the line the text starts on.
 * @property {boolean} edit - Whether the match is a scan-2 edit.
 */

/**
 * Reads the last name of a call's receiver: an identifier, or a member's static property name.
 * @param {object} node - The receiver expression.
 * @returns {{name: string, at: object} | null} The name and its node, or `null` when the receiver has no static name.
 */
function receiverName(node) {
   if (node.type === 'Identifier') {
      return {
         name: node.name,
         at: node,
      };
   }
   if (node.type === 'MemberExpression') {
      /** @type {string | null} The member's property name. */
      const name = staticKeyName(node.property, node.computed);
      return name === null
         ? null
         : {
            name,
            at: node.property,
         };
   }
   return null;
}

/**
 * Matches a call expression against both scans.
 * @param {object} node - A `CallExpression`.
 * @param {boolean} withEdits - Whether scan 2 applies.
 * @returns {NodeMatch | null} The match, or `null` when the call is not banned.
 */
function matchCall(node, withEdits) {
   /** @type {object} The callee. */
   const { callee } = node;
   if (callee.type === 'Identifier') {
      return NAMED_CALLS.has(callee.name)
         ? {
            text: `${callee.name}(`,
            at: callee,
            edit: false,
         }
         : null;
   }
   if (callee.type !== 'MemberExpression') {
      return null;
   }

   /** @type {string | null} The called method's name. */
   const name = staticKeyName(callee.property, callee.computed);
   /** @type {{name: string, at: object} | null} The receiver's last name. */
   const receiver = receiverName(callee.object);
   /** @type {object} The called method's node. */
   const at = callee.property;
   if (NAMED_CALLS.has(name)) {
      return {
         text: `${name}(`,
         at,
         edit: false,
      };
   }
   if (MEMBER_CALLS.has(name)) {
      return {
         text: `.${name}(`,
         at,
         edit: false,
      };
   }
   if (name === 'create') {
      // A document class reached through an alias (`cls.create(`, `getDocumentClass('Actor').create(`) is matched as
      // `.create(`; `Object.create(` makes no document.
      if (receiver?.name === 'Object') {
         return null;
      }
      return DOCUMENT_CLASSES.has(receiver?.name)
         ? {
            text: `${receiver.name}.create(`,
            at: receiver.at,
            edit: false,
         }
         : {
            text: '.create(',
            at,
            edit: false,
         };
   }
   if (!withEdits) {
      return null;
   }
   if (name === 'update') {
      return {
         text: '.update(',
         at,
         edit: true,
      };
   }
   if (SYSTEM_ACTION.test(name ?? '') && receiver?.name === 'system') {
      return {
         text: `.system${callee.optional ? '?' : ''}.${name}(`,
         at: receiver.at,
         edit: true,
      };
   }
   return null;
}

/**
 * Matches a `new` expression against scan 1.
 * @param {object} node - A `NewExpression`.
 * @returns {NodeMatch | null} The match, or `null` when the construction is not banned.
 */
function matchNew(node) {
   if (node.callee.type !== 'Identifier') {
      return null;
   }
   if (CONSTRUCTORS.has(node.callee.name)) {
      return {
         text: `new ${node.callee.name}(`,
         at: node,
         edit: false,
      };
   }
   /** @type {object | undefined} The event type argument. */
   const [type] = node.arguments;
   if (node.callee.name === 'DragEvent' && type && staticKeyName(type, true) === 'drop') {
      return {
         text: `new DragEvent(${type.type === 'Literal' ? type.raw : `\`${type.quasis[0].value.raw}\``}`,
         at: node,
         edit: false,
      };
   }
   return null;
}

/**
 * Decides whether a node names `keepId`: an identifier (a variable, a key or a member), or a string written as a key
 * (`{ 'keepId': true }`, `options['keepId']`). Any other string naming it is read as code and yields the identifier.
 * @param {object} node - A syntax-tree node.
 * @returns {boolean} Whether the node names `keepId`.
 */
function isKeepId(node) {
   /** @type {object | undefined} The node's parent. */
   const { parent } = node;
   if (node.type === 'Identifier') {
      // A shorthand `{ keepId }` holds two identifier nodes; its key alone is matched.
      return node.name === KEEP_ID && !(parent?.type === 'Property' && parent.shorthand && parent.value === node);
   }
   return (node.type === 'Literal' || node.type === 'TemplateLiteral') && staticKeyName(node, true) === KEEP_ID
      && ((parent?.type === 'Property' && parent.key === node)
         || (parent?.type === 'MemberExpression' && parent.property === node));
}

/**
 * Finds the banned calls in one source.
 * @param {string} file - The source path relative to `tests`, with forward slashes.
 * @param {string} source - The source text.
 * @returns {FoundOffender[]} One entry per banned call, with the 1-based line it starts on.
 */
function findOffenders(file, source) {
   /** @type {string[]} The source lines. */
   const lines = source.split('\n');
   /** @type {boolean} Whether scan 2 applies to this source. */
   const withEdits = file.startsWith('e2e/');

   /** @type {FoundOffender[]} The banned calls found. */
   const found = [];
   for (const node of parseNodes(source, file)) {
      /** @type {NodeMatch | null} The node's match. */
      let match = null;
      if (node.type === 'CallExpression') {
         match = matchCall(node, withEdits);
      }
      else if (node.type === 'NewExpression') {
         match = matchNew(node);
      }
      else if (isKeepId(node)) {
         match = {
            text: KEEP_ID,
            at: node,
            edit: false,
         };
      }
      if (match === null || (DELETION_SOURCES.includes(file) && /delete/i.test(match.text))) {
         continue;
      }

      /** @type {number} The 1-based line the match starts on. */
      const line = match.at.loc.start.line;
      found.push({
         file,
         match: match.text,
         source: lines[line - 1].trim(),
         line,
         edit: match.edit,
      });
   }
   return found;
}

/**
 * Removes the offenders a direct-update allowlist entry permits: scan-2 matches in the entry's file whose source line
 * matches the entry's pattern.
 * @param {FoundOffender[]} offenders - The offenders found.
 * @param {DirectUpdate[]} allowlist - The permitted direct updates.
 * @returns {{offenders: FoundOffender[], unused: DirectUpdate[]}} The offenders left and the allowlist entries that
 * permitted nothing.
 */
function applyDirectUpdates(offenders, allowlist) {
   /** @type {Set<DirectUpdate>} The allowlist entries that permitted at least one site. */
   const used = new Set();
   /** @type {FoundOffender[]} The offenders no entry permits. */
   const remaining = offenders.filter((offender) => {
      /** @type {DirectUpdate | undefined} The entry permitting the offender. */
      const entry = offender.edit
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
   it('flags each banned call once, in every callee form', () => {
      /** @type {[string, string][]} Each source with the one match it must yield. */
      const flagged = [
         // Named document classes, directly, through a namespace, optionally, or with a computed name.
         [
            'await Actor.create({ name: \'X\', type: \'player\' });',
            'Actor.create(',
         ],
         [
            'await foundry.documents.Scene.create({ name: \'S\' });',
            'Scene.create(',
         ],
         [
            'await Item?.create(data);',
            'Item.create(',
         ],
         [
            'await Macro[\'create\'](data);',
            'Macro.create(',
         ],
         // An alias of a document class.
         [
            'const cls = Item; await cls.create(data);',
            '.create(',
         ],
         [
            'await getDocumentClass(\'Actor\').create(data);',
            '.create(',
         ],
         // Member-only calls.
         [
            'await foundry.documents.collections.CompendiumCollection.createCompendium({ label });',
            '.createCompendium(',
         ],
         [
            'await Actor.createDocuments([data]);',
            '.createDocuments(',
         ],
         [
            'await adventure.import({ dialog: false });',
            '.import(',
         ],
         // Calls matched by name, as a member or a bare identifier.
         [
            'await actor.createEmbeddedDocuments(\'Item\', [data]);',
            'createEmbeddedDocuments(',
         ],
         [
            'await actor?.[\'updateEmbeddedDocuments\'](\'Item\', []);',
            'updateEmbeddedDocuments(',
         ],
         [
            'await toggleStatusEffect(\'prone\');',
            'toggleStatusEffect(',
         ],
         [
            'await actor.toggleStatusEffect(\'prone\');',
            'toggleStatusEffect(',
         ],
         [
            'const token = await actor.getTokenDocument();',
            'getTokenDocument(',
         ],
         [
            'await item.importFromJSON(json);',
            'importFromJSON(',
         ],
         [
            'const updates = SortingHelpers.performIntegerSort(source, options);',
            'performIntegerSort(',
         ],
         // Constructors.
         [
            'tray.dispatchEvent(new DragEvent("drop", { dataTransfer }));',
            'new DragEvent("drop"',
         ],
         [
            'tray.dispatchEvent(new DragEvent(`drop`));',
            'new DragEvent(`drop`',
         ],
         [
            'const transfer = new DataTransfer();',
            'new DataTransfer(',
         ],
         [
            'const doc = new Function(`return (${src})()`)();',
            'new Function(',
         ],
         // `keepId` as a key, a quoted key, shorthand, or a member.
         [
            'await pack.importDocument(item, { keepId: true });',
            'keepId',
         ],
         [
            'await pack.importDocument(item, { \'keepId\': true });',
            'keepId',
         ],
         [
            'await pack.importDocument(item, { keepId });',
            'keepId',
         ],
         [
            'const keep = options.keepId;',
            'keepId',
         ],
         // Scan 2: updates and action methods, dotted, optional or computed.
         [
            'await actor?.update({ name: \'Y\' });',
            '.update(',
         ],
         [
            'await actor[\'update\']({ name: \'Y\' });',
            '.update(',
         ],
         [
            'await game.actors.getName(\'X\')\n   .update({ name: \'Y\' });',
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
         [
            'await actor?.system.applyDamage(1);',
            '.system.applyDamage(',
         ],
         // Code passed to the browser as a string: a literal, a concatenation, a template with an expression.
         [
            'await page.evaluate(\'actor.system.rollAttackCheck({})\');',
            '.system.rollAttackCheck(',
         ],
         [
            'const src = \'actor.system.requestItemCheck({ itemId: id, \' +\n   \'checkIdx: 0 })\';',
            '.system.requestItemCheck(',
         ],
         [
            'await triggerInWorld(page, `\n   const actor = game.actors.getName(\'${name}\');\n'
               + '   await Item.create({}, { parent: actor });\n`);',
            'Item.create(',
         ],
         [
            'await page.evaluate(\'game.packs.get(id).importDocument(item, { keepId: true })\');',
            'keepId',
         ],
      ];
      for (const [source, match] of flagged) {
         expect.soft(findOffenders('e2e/x.spec.js', source).map((offender) => offender.match), source)
            .toEqual([match]);
      }
   });

   it('reads a code string as code: a function body, and the source line of each match', () => {
      expect(findOffenders('e2e/x.spec.js', 'const run = new Function(\'actor\', \'return actor.update({})\');')
         .map((offender) => offender.match)).toEqual([
         'new Function(',
         '.update(',
      ]);
      expect(findOffenders('e2e/x.spec.js', 'await run(`\n   const a = 1;\n   await Actor.create({});\n`);')
         .map((offender) => offender.line)).toEqual([3]);
      expect(findOffenders('e2e/x.spec.js', 'const src = \'const a = 1; \' +\n   \'Actor.create({})\';')
         .map((offender) => offender.line)).toEqual([2]);
   });

   it('passes comments, prose strings, other calls and the flow helpers', () => {
      /** @type {string[]} Sources with no banned call. */
      const clean = [
         '// await Actor.create({ name: \'X\' });',
         '/* actor.update({}) */',
         'const text = \'Actor.create({}) and actor.update({})\';',
         'test(\'an effect created with keepId keeps its id\', async () => {});',
         'const selector = \'[data-action="update"]\';',
         'await createCompendium(page, { label: \'E2E Pack\', type: \'Item\' });',
         'const proto = Object.create(null);',
         'window.dispatchEvent(new DragEvent(\'dragend\'));',
         'await actor.delete();',
         'await game.settings.set(\'titan\', \'key\', 1);',
         'const url = \'http://localhost:30000\'; await actor.sheet.render(true);',
         'const { create, update } = handlers;',
         'const options = { keepIds: true };',
         'await actor.system.isOwner();',
         'const fn = Function.prototype;',
         'await page.evaluate(() => actor.updateSource({}));',
      ];
      for (const source of clean) {
         expect.soft(findOffenders('e2e/x.spec.js', source), source).toEqual([]);
      }
   });

   it('fails on a source that does not parse, naming it', () => {
      expect(() => findOffenders('e2e/broken.spec.js', 'await Actor.create({'))
         .toThrow(/e2e\/broken\.spec\.js:1:\d+ does not parse/);
   });

   it('applies the edit scan to tests/e2e only, and spares deletions in the cleanup sources', () => {
      expect(findOffenders('shared/x.js', 'await actor.update({});')).toEqual([]);
      expect(findOffenders('shared/x.js', 'await Actor.create({});')).toHaveLength(1);
      expect(findOffenders('e2e/global-teardown.js', 'await actor.system.deleteItem(id);')).toEqual([]);
      expect(findOffenders('e2e/global-teardown.js', 'await actor.update({});')).toHaveLength(1);
   });

   it('permits a scan-2 site that matches a direct-update allowlist entry, and reports an unused entry', () => {
      /** @type {FoundOffender[]} A direct update and a creation on the same source line. */
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
      /** @type {{offenders: FoundOffender[], unused: DirectUpdate[]}} What is left. */
      const result = applyDirectUpdates(offenders, allowlist);
      expect(result.offenders.map((offender) => offender.match)).toEqual(['Actor.create(']);
      expect(result.unused).toEqual([allowlist[1]]);
   });

   it('reports the line a match starts on', () => {
      expect(findOffenders('e2e/x.spec.js', 'a;\nb;\nawait Actor.create({});')[0].line).toBe(3);
   });

   it('finds exactly the burn-down offenders under tests/e2e and tests/shared', { timeout: TREE_SCAN_TIMEOUT }, () => {
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

      /** @type {{offenders: FoundOffender[], unused: DirectUpdate[]}} The offenders left. */
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

      /** @type {FoundOffender[]} Offenders the burn-down list does not hold. */
      const unexpected = subtractOffenders(offenders, burnDown);
      /** @type {Offender[]} Burn-down entries no longer found. */
      const resolved = subtractOffenders(burnDown, offenders);
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
