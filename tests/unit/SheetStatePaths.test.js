import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { get } from 'svelte/store';
import createCharacterSheetData from '~/document/types/actor/types/character/sheet/CharacterSheetData.js';
import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';
import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';
import createWeaponSheetData from '~/document/types/item/types/weapon/sheet/WeaponSheetData.js';

/** @type {string} The absolute `src/` directory. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** @type {RegExp} Matches a component that reads the sheet state store from Svelte context, in any quote style. */
const STATE_CONTEXT_MARKER = /getContext\(\s*(['"`])applicationState\1\s*\)/;

/**
 * @typedef {object} SheetDefinition
 * @property {string} name - A label for the sheet.
 * @property {string} shell - The sheet's root component, relative to `src/`. Every component the sheet mounts is
 * reached by following `.svelte` imports from here.
 * @property {(document: object) => object} factory - The initial-state factory the sheet's `_createReactiveState`
 * builds its state from. The state-factory tests below trace the sheet class to its factory and fail on a mismatch.
 */

/** @type {object} A minimal document stand-in: the initial-state factories read only these fields. */
const DOCUMENT = {
   type: 'stand-in',
   items: [],
   system: {
      check: [],
      customAspect: [],
      attack: [],
      attackNotes: '',
   },
};

/**
 * Every sheet and the factory its `_createReactiveState` builds its state from. A `*SheetShell.svelte` component
 * outside this list fails the registry guard below, so a new sheet cannot skip the scan.
 * @type {SheetDefinition[]}
 */
const SHEETS = [
   {
      name: 'ability sheet',
      shell: 'document/types/item/types/ability/sheet/AbilitySheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'active effect sheet',
      shell: 'document/types/active-effect/sheet/ActiveEffectSheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'armor sheet',
      shell: 'document/types/item/types/armor/sheet/ArmorSheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'commodity sheet',
      shell: 'document/types/item/types/commodity/sheet/CommoditySheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'equipment sheet',
      shell: 'document/types/item/types/equipment/sheet/EquipmentSheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'NPC sheet',
      shell: 'document/types/actor/types/character/types/npc/NPCSheetShell.svelte',
      factory: createCharacterSheetData,
   },
   {
      name: 'player sheet',
      shell: 'document/types/actor/types/character/types/player/PlayerSheetShell.svelte',
      factory: createCharacterSheetData,
   },
   {
      name: 'shield sheet',
      shell: 'document/types/item/types/shield/sheet/ShieldSheetShell.svelte',
      factory: createRulesElementItemSheetData,
   },
   {
      name: 'spell sheet',
      shell: 'document/types/item/types/spell/sheet/SpellSheetShell.svelte',
      factory: createSpellSheetData,
   },
   {
      name: 'weapon sheet',
      shell: 'document/types/item/types/weapon/sheet/WeaponSheetShell.svelte',
      factory: createWeaponSheetData,
   },
];

/**
 * Lists every file below a directory.
 * @param {string} directory - The absolute directory to walk.
 * @returns {string[]} The absolute file paths.
 */
function listFiles(directory) {
   return readdirSync(directory).flatMap((entry) => {
      /** @type {string} The entry's absolute path. */
      const entryPath = path.join(directory, entry);
      return statSync(entryPath).isDirectory() ? listFiles(entryPath) : [entryPath];
   });
}

/** @type {string[]} Every file under `src/`, as absolute paths. */
const SOURCE_FILES = listFiles(SOURCE_DIRECTORY);

/**
 * Reads every source file with the given extension.
 * @param {string} extension - The file extension, including the dot.
 * @returns {Map<string, string>} Absolute path to source text.
 */
function readSources(extension) {
   return new Map(SOURCE_FILES
      .filter((file) => file.endsWith(extension))
      .map((file) => [
         file,
         readFileSync(file, 'utf-8'),
      ]));
}

/** @type {Map<string, string>} Every `.svelte` file under `src/`: absolute path to source text. */
const COMPONENTS = readSources('.svelte');

/** @type {Map<string, string>} Every `.js` file under `src/`: absolute path to source text. */
const SCRIPTS = readSources('.js');

/**
 * Resolves an import specifier, either `~/`-aliased or relative, to an absolute path.
 * @param {string} importer - The importing file's absolute path.
 * @param {string} specifier - The import specifier.
 * @returns {string} The imported file's absolute path.
 */
function resolveSpecifier(importer, specifier) {
   return specifier.startsWith('~/')
      ? path.join(SOURCE_DIRECTORY, specifier.slice(2))
      : path.resolve(path.dirname(importer), specifier);
}

/**
 * Lists a file's default imports.
 * @param {string} file - The importing file's absolute path.
 * @param {string} source - The importing file's source text.
 * @returns {{ binding: string, file: string }[]} Each imported binding and the absolute path it comes from.
 */
function listDefaultImports(file, source) {
   return [...source.matchAll(/import\s+([\w$]+)\s+from\s+(['"])([^'"]+)\2/g)].map((match) => ({
      binding: match[1],
      file: resolveSpecifier(file, match[3]),
   }));
}

/**
 * Lists the `.svelte` files a component imports.
 * @param {string} file - The importing component's absolute path.
 * @returns {string[]} The imported components' absolute paths.
 */
function listImportedComponents(file) {
   return listDefaultImports(file, COMPONENTS.get(file))
      .map((entry) => entry.file)
      .filter((imported) => imported.endsWith('.svelte'));
}

/**
 * Collects a component and every component it transitively imports.
 * @param {string} root - The root component's absolute path.
 * @returns {Set<string>} The absolute paths of the reachable components, including the root.
 */
function collectMountedComponents(root) {
   /** @type {Set<string>} The components visited so far. */
   const visited = new Set();

   /** @type {string[]} The components still to visit. */
   const pending = [root];
   while (pending.length > 0) {
      /** @type {string} The component to visit next. */
      const file = pending.pop();
      if (!visited.has(file)) {
         visited.add(file);
         pending.push(...listImportedComponents(file));
      }
   }

   return visited;
}

/**
 * @type {RegExp} Matches a literal `tabKey` prop, `tabKey={'x'}` or `tabKey="x"` in any quote style; group 2 or
 * group 4 is the key.
 */
const LITERAL_TAB_KEY = /tabKey=(?:\{\s*(['"`])(\w+)\1\s*\}|(['"])(\w+)\3)/g;

/**
 * Lists the values components pass as a literal `tabKey` prop; `$appState.tabs[tabKey]` reads resolve to these.
 * @param {Set<string>} files - The mounted components' absolute paths.
 * @returns {string[]} The literal tab keys.
 */
function collectTabKeys(files) {
   return [...files].flatMap((file) => [...COMPONENTS.get(file).matchAll(LITERAL_TAB_KEY)]
      .map((match) => match[2] ?? match[4]));
}

/**
 * @typedef {object} StatePath
 * @property {string} file - The reading component's path relative to `src/`.
 * @property {string[]} segments - The path below `$appState`, e.g. `['tabs', 'castingCheck', 'scrollTop']`.
 */

/**
 * Lists every `$appState` path a component reads or binds. Dotted chains are read in full, so a two-segment path
 * (`tabs.activeTab`, `sidebar.scrollTop`), a three-segment path (`tabs.<group>.<key>`) and deeper paths are all
 * covered. A `[tabKey]` read expands to every literal tab key in `tabKeys`.
 * @param {string} file - The component's absolute path.
 * @param {string[]} tabKeys - The literal tab keys the sheet's components pass.
 * @returns {StatePath[]} The paths the component reads.
 */
function listStatePaths(file, tabKeys) {
   /** @type {string} The component's source text. */
   const source = COMPONENTS.get(file);

   /** @type {string} The component's path relative to `src/`. */
   const relative = path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/');

   /** @type {StatePath[]} The paths found. */
   const found = [...source.matchAll(/\$appState((?:\.[A-Za-z_]\w*)+)/g)].map((match) => ({
      file: relative,
      segments: match[1].slice(1).split('.'),
   }));

   for (const match of source.matchAll(/\$appState\.(tabs)\[tabKey\]((?:\.[A-Za-z_]\w*)+)/g)) {
      for (const tabKey of tabKeys) {
         found.push({
            file: relative,
            segments: [
               match[1],
               tabKey,
               ...match[2].slice(1).split('.'),
            ],
         });
      }
   }

   return found;
}

/**
 * Walks a path down the initial state and describes the first segment the state does not define. A path ends
 * successfully at the first leaf or array, because the segments after it address the value (`list.length`), not the
 * state shape. An id-keyed map (`isExpanded: {}`) is an object like any other: the map itself must be defined, and a
 * dotted segment below it must be one of its initial keys. Components index such maps with brackets
 * (`isExpanded[id]`), which `listStatePaths` does not read as a segment.
 * @param {object} state - The sheet's initial state.
 * @param {string[]} segments - The path below `$appState`.
 * @returns {string | null} A description of the first missing segment, or null when the state defines the path.
 */
function findMissingSegment(state, segments) {
   /** @type {unknown} The node reached so far. */
   let node = state;
   for (let idx = 0; idx < segments.length; idx++) {
      if (node === null || typeof node !== 'object' || Array.isArray(node)) {
         return null;
      }
      if (!(segments[idx] in node)) {
         return `"${segments.slice(0, idx + 1).join('.')}" is not in the initial state (`
            + `${idx === 0 ? 'state' : segments.slice(0, idx).join('.')} defines: ${Object.keys(node).join(', ')})`;
      }
      node = node[segments[idx]];
   }

   return null;
}

/** @type {string[]} Absolute paths of the components that read the sheet state store. */
const STATE_READERS = [...COMPONENTS.entries()]
   .filter(([, source]) => STATE_CONTEXT_MARKER.test(source))
   .map(([file]) => file);

/** @type {{ sheet: SheetDefinition, mounted: Set<string>, paths: StatePath[] }[]} Each sheet's scan result. */
const SCANS = SHEETS.map((sheet) => {
   /** @type {Set<string>} The components the sheet mounts. */
   const mounted = collectMountedComponents(path.join(SOURCE_DIRECTORY, sheet.shell));

   /** @type {string[]} The literal tab keys within the sheet. */
   const tabKeys = collectTabKeys(mounted);
   return {
      sheet,
      mounted,
      paths: STATE_READERS.filter((file) => mounted.has(file)).flatMap((file) => listStatePaths(file, tabKeys)),
   };
});

/**
 * Lists the sheet classes that mount a shell: the modules that default-import it and declare a default class.
 * @param {string} shell - The shell component's absolute path.
 * @returns {string[]} The sheet class modules' absolute paths.
 */
function findSheetClasses(shell) {
   return [...SCRIPTS.entries()]
      .filter(([file, source]) => /export\s+default\s+class\b/.test(source)
         && listDefaultImports(file, source).some((entry) => entry.file === shell))
      .map(([file]) => file);
}

/**
 * @typedef {object} StateFactoryTrace
 * @property {string} [stateModule] - The absolute path of the state-store module `_createReactiveState` calls.
 * @property {string} [problem] - Why the trace failed, when it did.
 */

/**
 * Follows a sheet class's `_createReactiveState` override chain, from the class up its `extends` chain, to the
 * nearest override, and resolves the state-store factory that override returns. The override must be a single
 * `return createX(this.document);`; any other shape fails the trace, so a changed override cannot pass unread.
 * @param {string} classFile - The sheet class module's absolute path.
 * @returns {StateFactoryTrace} The state-store module, or the reason none was found.
 */
function traceStateFactory(classFile) {
   /** @type {string} The class module being inspected. */
   let file = classFile;
   while (SCRIPTS.has(file)) {
      /** @type {string} The class module's source text. */
      const source = SCRIPTS.get(file);

      /** @type {string} The class module's path relative to `src/`. */
      const relative = path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/');

      /** @type {RegExpMatchArray | null} The `_createReactiveState` override; group 2 is its body. */
      const override = source.match(/\n([ \t]*)_createReactiveState\(\)\s*\{([\s\S]*?)\n\1\}/);
      if (override) {
         /** @type {RegExpMatchArray | null} The returned call; group 1 is the called factory's binding. */
         const call = override[2]
            .replace(/\/\/.*$/gm, '')
            .match(/^\s*return\s+([\w$]+)\(\s*(?:\/\*[\s\S]*?\*\/\s*)?this\.document\s*\);\s*$/);
         if (!call) {
            return { problem: `${relative}: _createReactiveState is not a single \`return createX(this.document);\`` };
         }

         /** @type {{ binding: string, file: string } | undefined} The called factory's import. */
         const factoryImport = listDefaultImports(file, source).find((entry) => entry.binding === call[1]);
         return factoryImport
            ? { stateModule: factoryImport.file }
            : { problem: `${relative}: ${call[1]} is not a default import` };
      }

      /** @type {RegExpMatchArray | null} The class declaration; group 1 is the parent class's binding. */
      const parent = source.match(/export\s+default\s+class\s+[\w$]+\s+extends\s+([\w$]+)/);

      /** @type {{ binding: string, file: string } | undefined} The parent class's import. */
      const parentImport = parent && listDefaultImports(file, source).find((entry) => entry.binding === parent[1]);
      if (!parentImport) {
         return { problem: `${relative}: no _createReactiveState override and no imported parent class` };
      }
      file = parentImport.file;
   }

   return { problem: `${path.relative(SOURCE_DIRECTORY, file)} is not a source module` };
}

/** @type {string[]} Every initial-state data factory module (`*SheetData.js`) under `src/`. */
const DATA_FACTORY_MODULES = [...SCRIPTS.keys()].filter((file) => file.endsWith('SheetData.js'));

describe('sheet registry', () => {
   it('lists every sheet shell component', () => {
      /** @type {string[]} The shells in `src/`, relative. */
      const shells = [...COMPONENTS.keys()]
         .map((file) => path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/'))
         .filter((file) => file.endsWith('SheetShell.svelte') && !file.endsWith('/DocumentSheetShell.svelte'));

      expect(shells.sort()).toEqual(SHEETS.map((sheet) => sheet.shell).sort());
   });

   it('reaches every component that reads the sheet state from some registered sheet', () => {
      /** @type {string[]} Readers no registered sheet mounts. */
      const unmapped = STATE_READERS
         .filter((file) => !SCANS.some((scan) => scan.mounted.has(file)))
         .map((file) => path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/'));

      expect(unmapped).toEqual([]);
   });

   it('names factories that build distinct states for the stand-in, so a state identifies its factory', async () => {
      /** @type {Function[]} The default export of every data factory module. */
      const factories = await Promise.all(DATA_FACTORY_MODULES.map(async (file) => (await import(file)).default));
      expect(factories.length).toBeGreaterThan(4);
      for (const sheet of SHEETS) {
         expect(factories, `${sheet.name}'s factory is a *SheetData.js default export`).toContain(sheet.factory);
      }

      for (let first = 0; first < factories.length; first++) {
         for (let second = first + 1; second < factories.length; second++) {
            expect(factories[first](DOCUMENT), `${factories[first].name} vs ${factories[second].name}`)
               .not.toEqual(factories[second](DOCUMENT));
         }
      }
   });
});

describe('findMissingSegment', () => {
   /** @type {object} A state with a group, a leaf, an array and an id-keyed map. */
   const state = {
      tabs: {
         activeTab: 'a',
         group: {
            scrollTop: 0,
            nested: { flag: true },
            list: [],
            map: {},
         },
      },
   };

   it('accepts defined two-, three- and four-segment paths and paths that continue past a leaf or array', () => {
      expect(findMissingSegment(state, [
         'tabs',
         'activeTab',
      ])).toBeNull();
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'scrollTop',
      ])).toBeNull();
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'nested',
         'flag',
      ])).toBeNull();
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'list',
         'length',
      ])).toBeNull();
   });

   it('accepts a path that ends at an id-keyed map and names a dotted key below it', () => {
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'map',
      ])).toBeNull();
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'map',
         'abc',
      ])).toBe('"tabs.group.map.abc" is not in the initial state (tabs.group.map defines: )');
   });

   it('names a misspelled group key without throwing', () => {
      expect(findMissingSegment(state, [
         'tabs',
         'gruop',
         'scrollTop',
      ])).toBe(
         '"tabs.gruop" is not in the initial state (tabs defines: activeTab, group)',
      );
   });

   it('names a misspelled leaf key, a misspelled section and a missing top-level section', () => {
      expect(findMissingSegment(state, [
         'tabs',
         'group',
         'ScrollTop',
      ])).toContain('"tabs.group.ScrollTop"');
      expect(findMissingSegment(state, [
         'tabs',
         'activTab',
      ])).toContain('"tabs.activTab"');
      expect(findMissingSegment(state, [
         'sidebar',
         'scrollTop',
      ])).toContain('"sidebar" is not in the initial state');
   });
});

describe.each(SCANS.map((scan) => [
   scan.sheet.name,
   scan,
]))('%s application state paths', (name, scan) => {
   it('builds its state with the registered factory', async () => {
      /** @type {string[]} The sheet classes that mount the shell. */
      const classes = findSheetClasses(path.join(SOURCE_DIRECTORY, scan.sheet.shell));
      expect(classes).toHaveLength(1);

      /** @type {StateFactoryTrace} The state-store factory the class's `_createReactiveState` calls. */
      const trace = traceStateFactory(classes[0]);
      expect(trace.problem).toBeUndefined();

      /** @type {(document: object) => object} The traced state-store factory. */
      const createStateStore = (await import(trace.stateModule)).default;
      expect(get(createStateStore(DOCUMENT))).toEqual(scan.sheet.factory(DOCUMENT));
   });

   it('finds state paths in the components it mounts', () => {
      expect(scan.paths.map((entry) => entry.segments.join('.'))).toContain('tabs.activeTab');
      expect(scan.paths.length).toBeGreaterThan(3);
   });

   it('reads only paths the initial sheet state defines', () => {
      /** @type {object} The sheet's initial state. */
      const state = scan.sheet.factory(DOCUMENT);

      /** @type {string[]} One message per path the state does not define. */
      const problems = scan.paths
         .map((entry) => ({
            entry,
            missing: findMissingSegment(state, entry.segments),
         }))
         .filter(({ missing }) => missing !== null)
         .map(({ entry, missing }) => `${entry.file} reads $appState.${entry.segments.join('.')}: ${missing}`);

      expect(problems).toEqual([]);
   });
});
