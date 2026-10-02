import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNodes, staticKeyName, TREE_SCAN_TIMEOUT } from './helpers/parseSource.js';

// A unit test may use synthetic data only for UI elements, document-agnostic operations, intermediate computations on
// given inputs, and tests that invalid data is rejected or handled (`.claude/claude.md`, "Tests use genuine live
// documents"). A fake document that accepts writes stands in for a live document, so this guard finds every unit
// source that builds a fake write surface and requires it to be listed in `tests/unit/fake-documents.allowlist.json`.
//
// The guard reads each source's syntax tree (`helpers/parseSource.js`), with the code held in its strings, so a form is
// one node type whatever its spelling. A fake write surface binds a document write method's name (`WRITE_NAMES`) to a
// value that may be a function (see `mayBeFunction`), through:
// - an object-literal property, plain or shorthand (`{ update }`), or a getter;
// - an object-literal method;
// - a class field, method or getter, static or not;
// - an assignment to a member (`=`, `||=`, `&&=` or `??=`);
// - a destructuring default (`const { update = vi.fn() } = …`);
// - a `vi.spyOn(target, '<name>')`.
// A key or member name may be bare, quoted, or a computed string or template literal (`['update']`). A `_source` key
// (a fake document's stored data) is a fake write surface whatever its value: an object-literal property or getter, a
// class field or getter, or a member assignment.
//
// The allowlist has two kinds. A permitted entry names the clause of the rule that allows the file's fakes. A burn-down
// entry names the rewrite phase that deletes the file; the guard reads the current phase from `tests/unit/phase.json`
// (bumped in each phase's first commit) and fails once the file outlives its phase. The guard also fails on a matching
// file that is not listed, and on a listed file that is gone or no longer matches.
//
// Known limits of the scan: a name the syntax does not hold is not found. That is a computed key held in a variable
// (`[key]`), and a binding made through `Object.defineProperty`, `Reflect.set` or `Reflect.defineProperty`. Code held
// in a string is found only when the string's text alone parses.

/** @type {string} The unit test directory. */
const UNIT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));

/** @type {string} The allowlist of unit sources that build fake write surfaces. */
const ALLOWLIST_PATH = path.join(UNIT_DIRECTORY, 'fake-documents.allowlist.json');

/** @type {string} The current rewrite phase. */
const PHASE_PATH = path.join(UNIT_DIRECTORY, 'phase.json');

/** @type {string} This guard's own source, whose test cases quote fake write surfaces. */
const GUARD_SOURCE = 'UnitFakeDocuments.test.js';

/** @type {Set<string>} The document write methods a fake may not bind. */
const WRITE_NAMES = new Set([
   'create',
   'createDocuments',
   'update',
   'delete',
   'createEmbeddedDocuments',
   'deleteEmbeddedDocuments',
   'updateEmbeddedDocuments',
   'createEffects',
   'updateEffects',
   'deleteEffects',
   'deleteItems',
]);

/** @type {string} The key of a fake document's stored data, a fake write surface whatever its value. */
const SOURCE_KEY = '_source';

/** @type {Set<string>} The assignment operators that can store a function: plain and logical assignment. */
const STORING_OPERATORS = new Set([
   '=',
   '||=',
   '&&=',
   '??=',
]);

/** @type {Set<string>} The expression types whose value is never a function: literals, objects, arrays, operators. */
const NON_FUNCTION_TYPES = new Set([
   'Literal',
   'TemplateLiteral',
   'ObjectExpression',
   'ArrayExpression',
   'UnaryExpression',
   'BinaryExpression',
   'UpdateExpression',
]);

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

/**
 * Decides whether an expression may evaluate to a function. Only a value that is never one is excluded, so a `vi.fn`,
 * a function, an arrow, a class, an identifier, a member read or a call (which may hold or return one) all count.
 * @param {object} node - The expression node.
 * @returns {boolean} Whether the value may be a function.
 */
function mayBeFunction(node) {
   if (NON_FUNCTION_TYPES.has(node.type)) {
      return false;
   }
   if (node.type === 'Identifier') {
      return node.name !== 'undefined';
   }
   if (node.type === 'ConditionalExpression') {
      return mayBeFunction(node.consequent) || mayBeFunction(node.alternate);
   }
   if (node.type === 'LogicalExpression') {
      return mayBeFunction(node.left) || mayBeFunction(node.right);
   }
   if (node.type === 'SequenceExpression') {
      return mayBeFunction(node.expressions.at(-1));
   }
   return true;
}

/**
 * Decides whether a binding of a name is a fake write surface.
 * @param {string | null} name - The bound name, or `null` when it is not static.
 * @param {object | null} value - The bound value, or `null` for a method or getter, whose value is code.
 * @returns {boolean} Whether the binding is a fake write surface.
 */
function isFakeBinding(name, value) {
   if (name === SOURCE_KEY) {
      return true;
   }
   return WRITE_NAMES.has(name) && (value === null || mayBeFunction(value));
}

/**
 * Names the fake write surface a node builds, if any.
 * @param {object} node - A syntax-tree node.
 * @returns {string | null} The form and the bound name, or `null` when the node builds none.
 */
function describeFakeSurface(node) {
   if (node.type === 'Property' && node.parent.type === 'ObjectExpression' && node.kind !== 'set') {
      /** @type {string | null} The key's name. */
      const name = staticKeyName(node.key, node.computed);
      /** @type {boolean} Whether the property's value is code: a method or a getter. */
      const isCode = node.method || node.kind === 'get';
      if (isFakeBinding(name, isCode ? null : node.value)) {
         return `object-literal ${isCode ? 'method' : 'property'} ${name}`;
      }
   }
   if ((node.type === 'MethodDefinition' && (node.kind === 'method' || node.kind === 'get'))
      || (node.type === 'PropertyDefinition' && node.value !== null)) {
      /** @type {string | null} The member's name. */
      const name = staticKeyName(node.key, node.computed);
      if (isFakeBinding(name, node.type === 'MethodDefinition' ? null : node.value)) {
         return `class ${node.type === 'MethodDefinition' ? 'method' : 'field'} ${name}`;
      }
   }
   if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression'
      && STORING_OPERATORS.has(node.operator)) {
      /** @type {string | null} The assigned member's name. */
      const name = staticKeyName(node.left.property, node.left.computed);
      if (isFakeBinding(name, node.right)) {
         return `member assignment ${name}`;
      }
   }
   if (node.type === 'AssignmentPattern') {
      /** @type {string | null} The destructured name: the object pattern's key, or the array pattern's binding. */
      let name = null;
      if (node.parent.type === 'Property' && node.parent.parent.type === 'ObjectPattern') {
         name = staticKeyName(node.parent.key, node.parent.computed);
      }
      else if (node.parent.type === 'ArrayPattern' && node.left.type === 'Identifier') {
         name = node.left.name;
      }
      if (WRITE_NAMES.has(name) && mayBeFunction(node.right)) {
         return `destructuring default ${name}`;
      }
   }
   if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression'
      && node.callee.object.type === 'Identifier' && node.callee.object.name === 'vi'
      && staticKeyName(node.callee.property, node.callee.computed) === 'spyOn' && node.arguments.length >= 2) {
      /** @type {string | null} The spied method's name. */
      const name = staticKeyName(node.arguments[1], true);
      if (WRITE_NAMES.has(name)) {
         return `vi.spyOn ${name}`;
      }
   }
   return null;
}

/**
 * Finds the fake write surfaces a source builds.
 * @param {string} source - The source text.
 * @param {string} [file] - The source path, named when the source does not parse.
 * @returns {string[]} One `line — form name` entry per fake write surface.
 */
function findFakeSurfaces(source, file = 'source') {
   /** @type {string[]} The fake write surfaces found. */
   const found = [];
   for (const node of parseNodes(source, file)) {
      /** @type {string | null} The fake write surface the node builds. */
      const surface = describeFakeSurface(node);
      if (surface !== null) {
         found.push(`${node.loc.start.line} — ${surface}`);
      }
   }
   return found;
}

describe('unit fake documents', () => {
   it('flags each fake write surface', () => {
      /** @type {string[]} Sources that each build one fake write surface. */
      const fakes = [
         // Object-literal properties: bare, quoted, computed, template-computed, shorthand, and a getter.
         'const actor = { update: vi.fn() };',
         'const pack = {\n   id: \'p\',\n   \'delete\': async () => {},\n};',
         'globalThis.Macro = { create: async (data) => data };',
         'const pack = { getIndex: vi.fn(), create: mockCreate };',
         'const actor = { [\'update\']: vi.fn() };',
         'const pack = { [`createDocuments`]: async (data) => data };',
         'const update = vi.fn();\nconst actor = { name: \'a\', update };',
         'const pack = { getIndex, deleteEmbeddedDocuments };',
         'const actor = { update: flag ? vi.fn() : null };',
         'const actor = { get update() {\n   return vi.fn();\n} };',
         // Object-literal methods: bare, async, generator, quoted, computed.
         'const target = { name: \'t\', async createEffects(data) { return data; } };',
         'const doc = { deleteItems(ids) {\n   return ids;\n} };',
         'const doc = { \'update\'(data) {\n   return data;\n} };',
         'const doc = { *createDocuments() {\n   yield 1;\n} };',
         'const doc = { [\'updateEmbeddedDocuments\'](data) {\n   return data;\n} };',
         // Class methods and getters, static or not, bare, quoted or computed.
         'class FakeActor {\n   get name() {\n      return \'a\';\n   }\n'
            + '   async update(data) {\n      return data;\n   }\n}',
         'class FakePack {\n   static async createDocuments(data) {\n      return data;\n   }\n}',
         'class FakeActor {\n   [\'update\'](data) {\n      return data;\n   }\n}',
         'class FakeActor {\n   async "deleteEffects"(ids) {\n      return ids;\n   }\n}',
         'class FakeActor {\n   get update() {\n      return vi.fn();\n   }\n}',
         // Class fields, static or not, bare, quoted or computed.
         'class FakeActor {\n   update = vi.fn();\n}',
         'class FakePack {\n   static create = async (data) => data;\n}',
         'class FakeActor {\n   \'delete\' = mockDelete;\n}',
         'class FakePack {\n   static [\'create\'] = vi.fn();\n}',
         // Member assignments: dotted, optional target, computed, logical.
         'target.deleteEffects = async (ids) => ids;',
         'actor[\'createEmbeddedDocuments\'] = vi.fn();',
         'game.actors.get(id).update = vi.fn();',
         'actor[`update`] ??= vi.fn();',
         // Destructuring defaults, in an object or array pattern.
         'const { update = vi.fn() } = options;',
         'const { create: makeOne = async (data) => data } = options;',
         'function build({ deleteItems = vi.fn() } = {}) {\n   return deleteItems;\n}',
         'const [update = vi.fn()] = handlers;',
         // A spy.
         'vi.spyOn(actor, \'update\').mockResolvedValue(actor);',
         // `_source`, whatever its value: property, shorthand, class field, member assignment.
         'const stored = { id: \'a\', _source: { items: [] } };',
         'const stored = { id: \'a\', _source };',
         'class FakeItem {\n   _source = {};\n}',
         'doc._source = { name: \'x\' };',
         // Code held in a string.
         'const source = `actor.update = ${handler}`;',
         'const run = new Function(\'return { create: async (data) => data };\');',
      ];
      for (const source of fakes) {
         expect.soft(findFakeSurfaces(source), source).toHaveLength(1);
      }
   });

   it('passes calls, reads, ternaries, switch labels, comments, prose strings and non-function values', () => {
      /** @type {string[]} Sources that build no fake write surface. */
      const others = [
         'await actor.update({ name: \'x\' });',
         'expect(actor.update).toHaveBeenCalledWith({});',
         'const model = Object.create(CharacterDataModel.prototype);',
         'const value = flag ? update : other;',
         'switch (kind) {\n   case \'update\':\n      break;\n}',
         '// const fake = { update: vi.fn() };',
         '/* class Fake {\n   update = vi.fn();\n} */',
         'it(\'calls update: a vi.fn() spy records it\', () => {});',
         'const source = \'actor.update({ name: "x" })\';',
         'delete globalThis.game;',
         'expect([a, create({})]).toEqual([]);',
         'if (actor._source.items) {\n   x();\n}',
         'const { _source } = actor;',
         'const names = [\'createEffects\', \'deleteItems\'];',
         'await actor.update(data, { diff: false, update: true });',
         'const options = { update: { system: {} }, create: \'x\', delete: [1] };',
         'const options = { update: undefined, create: -1, delete: `x` };',
         'const options = { update: !flag, create: count + 1 };',
         'const options = { update: flag ? true : null };',
         'class Options {\n   update = true;\n   static create = null;\n   delete;\n}',
         'class Options {\n   set update(value) {\n      this.value = value;\n   }\n}',
         'const flags = { [\'update\']: false };',
         'const handlers = { [name]: vi.fn() };',
         'if ([\'update\', \'delete\'].includes(kind)) {\n   x();\n}',
         'items.forEach((update) => apply(update));',
         'if (update === other) {\n   x();\n}',
         'let update = vi.fn();\nupdate = vi.fn();',
         'function apply(update = vi.fn()) {\n   return update;\n}',
         'const { update = true } = options;',
         'const { update } = actor;',
         'target.update = null;',
         'target.count += 1;',
         'vi.spyOn(actor, \'render\');',
         'class FakeActor {\n   constructor() {\n      this.name = \'a\';\n   }\n}',
      ];
      for (const source of others) {
         expect.soft(findFakeSurfaces(source), source).toEqual([]);
      }
   });

   it('fails on a source that does not parse, naming it', () => {
      expect(() => findFakeSurfaces('const actor = {', 'broken.test.js'))
         .toThrow(/broken\.test\.js:1:\d+ does not parse/);
   });

   it(
      'lists every unit source that builds a fake write surface, and nothing else',
      { timeout: TREE_SCAN_TIMEOUT },
      () => {
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
            const surfaces = findFakeSurfaces(readFileSync(path.join(UNIT_DIRECTORY, file), 'utf8'), file);
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
      },
   );
});
