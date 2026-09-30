import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import createCharacterSheetData from '~/document/types/actor/types/character/sheet/CharacterSheetData.js';
import createRulesElementItemSheetData from '~/document/types/item/sheet/RulesElementItemSheetData.js';
import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';
import createWeaponSheetData from '~/document/types/item/types/weapon/sheet/WeaponSheetData.js';

/** @type {string} The absolute `src/` directory. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** @type {string} Matches a component that reads the sheet state store from Svelte context. */
const STATE_CONTEXT_MARKER = 'getContext(\'applicationState\')';

/**
 * @typedef {object} SheetDefinition
 * @property {string} name - A label for the sheet.
 * @property {string} shell - The sheet's root component, relative to `src/`. Every component the sheet mounts is
 * reached by following `.svelte` imports from here.
 * @property {() => object} createState - Builds the sheet's initial state with the factory its sheet class uses.
 */

/** @type {object} A minimal Item stand-in: the initial-state factories read only these fields. */
const ITEM = {
   type: 'stand-in',
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
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'active effect sheet',
      shell: 'document/types/active-effect/sheet/ActiveEffectSheetShell.svelte',
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'armor sheet',
      shell: 'document/types/item/types/armor/sheet/ArmorSheetShell.svelte',
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'commodity sheet',
      shell: 'document/types/item/types/commodity/sheet/CommoditySheetShell.svelte',
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'equipment sheet',
      shell: 'document/types/item/types/equipment/sheet/EquipmentSheetShell.svelte',
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'NPC sheet',
      shell: 'document/types/actor/types/character/types/npc/NPCSheetShell.svelte',
      createState: () => createCharacterSheetData({ items: [] }),
   },
   {
      name: 'player sheet',
      shell: 'document/types/actor/types/character/types/player/PlayerSheetShell.svelte',
      createState: () => createCharacterSheetData({ items: [] }),
   },
   {
      name: 'shield sheet',
      shell: 'document/types/item/types/shield/sheet/ShieldSheetShell.svelte',
      createState: () => createRulesElementItemSheetData(ITEM),
   },
   {
      name: 'spell sheet',
      shell: 'document/types/item/types/spell/sheet/SpellSheetShell.svelte',
      createState: () => createSpellSheetData(ITEM),
   },
   {
      name: 'weapon sheet',
      shell: 'document/types/item/types/weapon/sheet/WeaponSheetShell.svelte',
      createState: () => createWeaponSheetData(ITEM),
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

/** @type {Map<string, string>} Every `.svelte` file under `src/`: absolute path to source text. */
const COMPONENTS = new Map(
   listFiles(SOURCE_DIRECTORY)
      .filter((file) => file.endsWith('.svelte'))
      .map((file) => [
         file,
         readFileSync(file, 'utf-8'),
      ]),
);

/**
 * Lists the `.svelte` files a component imports.
 * @param {string} file - The importing component's absolute path.
 * @returns {string[]} The imported components' absolute paths.
 */
function listImportedComponents(file) {
   return [...COMPONENTS.get(file).matchAll(/import\s+[\w$]+\s+from\s+'([^']+\.svelte)'/g)]
      .map((match) => (match[1].startsWith('~/')
         ? path.join(SOURCE_DIRECTORY, match[1].slice(2))
         : path.resolve(path.dirname(file), match[1])));
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
 * Lists the values components pass as a literal `tabKey` prop; `$appState.tabs[tabKey]` reads resolve to these.
 * @param {Set<string>} files - The mounted components' absolute paths.
 * @returns {string[]} The literal tab keys.
 */
function collectTabKeys(files) {
   return [...files].flatMap((file) => [...COMPONENTS.get(file).matchAll(/tabKey=\{'(\w+)'\}/g)]
      .map((match) => match[1]));
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
 * successfully at the first non-object value (a leaf, an array, or an id-keyed map's method), because the segments
 * after it address the value, not the state shape.
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
   .filter(([, source]) => source.includes(STATE_CONTEXT_MARKER))
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
   it('finds state paths in the components it mounts', () => {
      expect(scan.paths.map((entry) => entry.segments.join('.'))).toContain('tabs.activeTab');
      expect(scan.paths.length).toBeGreaterThan(3);
   });

   it('reads only paths the initial sheet state defines', () => {
      /** @type {object} The sheet's initial state. */
      const state = scan.sheet.createState();

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
