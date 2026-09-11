import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/** @type {string} The JSON source directory compiled into the shipped `titan.effects` compendium. */
const SOURCE_DIR = path.resolve(__dirname, '../../packs/_source/effects');

/** @type {RegExp} Foundry document ids are sixteen alphanumeric characters. */
const ID_PATTERN = /^[A-Za-z0-9]{16}$/;

/** @type {string[]} The duration types `TitanActiveEffectDataModel` understands. */
const DURATION_TYPES = [
   'turnStart',
   'turnEnd',
   'initiative',
   'permanent',
   'custom',
];

/**
 * Stat vocabularies mirroring `CharacterDataModel._defineDocumentSchema()`; a seeded element that names a
 * key outside these applies to nothing at runtime.
 * @type {Object<string, string[]>}
 */
const STAT_KEYS = {
   attribute: [
      'body',
      'mind',
      'soul',
      'all',
   ],
   resistance: [
      'reflexes',
      'resilience',
      'willpower',
      'all',
   ],
   rating: [
      'awareness',
      'defense',
      'melee',
      'accuracy',
      'initiative',
      'all',
   ],
   resource: [
      'stamina',
      'resolve',
      'wounds',
      'all',
   ],
   speed: [
      'stride',
      'fly',
      'climb',
      'swim',
      'burrow',
      'all',
   ],
   mod: [
      'armor',
      'damage',
      'healing',
      'resolveRegain',
      'woundRegain',
      'all',
   ],
};

/** @type {string[]} The `modifierType` values `ItemSheetConditionalCheckModifierSettings` offers. */
const CHECK_MODIFIER_TYPES = [
   'damage',
   'dice',
   'expertise',
   'training',
   'healing',
];

/** @type {string[]} The `checkType` values `ItemSheetConditionalCheckModifierSettings` offers. */
const CHECK_TYPES = [
   'any',
   'attack',
   'casting',
   'item',
];

/**
 * Reads every JSON document under the source directory, recursing into folder directories.
 * @param {string} dir - The directory to walk.
 * @returns {{ file: string, doc: object }[]} The parsed documents with their relative file paths.
 */
function readSource(dir) {
   const entries = [];
   for (const name of readdirSync(dir)) {
      const full = path.join(dir, name);
      if (statSync(full).isDirectory()) {
         entries.push(...readSource(full));
      }
      else if (name.endsWith('.json')) {
         entries.push({
            file: path.relative(SOURCE_DIR, full),
            doc: JSON.parse(readFileSync(full, 'utf8')),
         });
      }
   }
   return entries;
}

const entries = readSource(SOURCE_DIR);
const folders = entries.filter(({ doc }) => doc._key.startsWith('!folders!'));
const effects = entries.filter(({ doc }) => doc._key.startsWith('!effects!'));

describe('standard effects compendium source', () => {
   it('holds folders and effects only, each keyed by its own id', () => {
      expect(effects.length).toBeGreaterThan(0);
      expect(folders.length).toBeGreaterThan(0);
      expect(folders.length + effects.length).toBe(entries.length);
      for (const { file, doc } of entries) {
         expect(doc._id, `${file} id`).toMatch(ID_PATTERN);
         expect(doc._key, `${file} key`).toMatch(new RegExp(`^!(effects|folders)!${doc._id}$`));
      }
   });

   it('uses unique ids, names, and rules-element uuids', () => {
      const ids = entries.map(({ doc }) => doc._id);
      expect(new Set(ids).size).toBe(ids.length);
      const names = effects.map(({ doc }) => doc.name);
      expect(new Set(names).size).toBe(names.length);
      const uuids = effects.flatMap(({ doc }) => doc.system.rulesElement.map((element) => element.uuid));
      expect(new Set(uuids).size).toBe(uuids.length);
   });

   it('files every document in the directory of its folder', () => {
      for (const { file, doc } of folders) {
         expect(doc.type, `${file} folder type`).toBe('ActiveEffect');
         expect(path.basename(file)).toBe('_Folder.json');
         expect(path.dirname(file)).toBe(`${doc.name.replace(/[^A-Za-z0-9]+/g, '_')}_${doc._id}`);
      }
      const folderIds = new Set(folders.map(({ doc }) => doc._id));
      for (const { file, doc } of effects) {
         expect(folderIds.has(doc.folder), `${file} folder reference`).toBe(true);
         const folder = folders.find((entry) => entry.doc._id === doc.folder);
         expect(path.dirname(file)).toBe(path.dirname(folder.file));
      }
   });

   it('shapes every effect as a TITAN effect the tray and HUD can display', () => {
      for (const { file, doc } of effects) {
         expect(doc.type, `${file} type`).toBe('effect');
         expect(doc.name.length, `${file} name`).toBeGreaterThan(0);
         expect(doc.img, `${file} img`).toMatch(/^icons\/svg\/[a-z-]+\.svg$/);
         expect(doc.description, `${file} description`).toMatch(/^<p>.+<\/p>$/);
         expect(doc.disabled, `${file} disabled`).toBe(false);
         expect(doc.changes, `${file} changes`).toEqual([]);
         expect(Number.isInteger(doc.sort), `${file} sort`).toBe(true);

         const { duration, check, customTrait } = doc.system;
         expect(DURATION_TYPES, `${file} duration type`).toContain(duration.type);
         expect(Number.isInteger(duration.remaining) && duration.remaining >= 1, `${file} remaining`).toBe(true);
         expect(Number.isInteger(duration.initiative), `${file} initiative`).toBe(true);
         expect(typeof duration.custom, `${file} custom`).toBe('string');
         expect(duration.custom.length > 0, `${file} custom duration label`).toBe(duration.type === 'custom');
         expect(check, `${file} checks`).toEqual([]);
         expect(customTrait, `${file} custom traits`).toEqual([]);
      }
   });

   it('seeds only rules elements the character pipeline applies', () => {
      for (const { file, doc } of effects) {
         for (const element of doc.system.rulesElement) {
            const label = `${file} ${element.uuid}`;
            expect(element.uuid, label).toMatch(/^standard-[a-z-]+$/);
            switch (element.operation) {
               case 'flatModifier':
               case 'setSum': {
                  expect(Object.keys(STAT_KEYS), `${label} selector`).toContain(element.selector);
                  expect(STAT_KEYS[element.selector], `${label} key`).toContain(element.key);
                  expect(Number.isInteger(element.value), `${label} value`).toBe(true);
                  if (element.operation === 'setSum') {
                     expect([
                        'set',
                        'min',
                        'max',
                     ], `${label} mode`).toContain(element.mode);
                  }
                  break;
               }
               case 'conditionalCheckModifier': {
                  expect(CHECK_MODIFIER_TYPES, `${label} modifierType`).toContain(element.modifierType);
                  expect(CHECK_TYPES, `${label} checkType`).toContain(element.checkType);
                  expect(element.selector, `${label} selector`).toBe('any');
                  expect(Number.isInteger(element.value), `${label} value`).toBe(true);
                  break;
               }
               default: {
                  throw new Error(`${label}: unexpected operation ${element.operation}`);
               }
            }
         }
      }
   });

   it('gives the rulebook actions and circumstances their mechanical modifiers', () => {
      /**
       * Finds a seeded effect's rules elements by name, stripped of their uuids.
       * @param {string} name - The effect name.
       * @returns {object[]} The uuid-less rules elements.
       */
      const elementsOf = (name) => effects
         .find(({ doc }) => doc.name === name)
         .doc.system.rulesElement
         .map(({ uuid, ...rest }) => rest);

      expect(elementsOf('Dodging')).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: 1,
         },
         {
            operation: 'flatModifier',
            selector: 'resistance',
            key: 'reflexes',
            value: 1,
         },
      ]);
      expect(elementsOf('Charging')).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: -1,
         },
         {
            operation: 'conditionalCheckModifier',
            modifierType: 'dice',
            checkType: 'attack',
            selector: 'any',
            key: '',
            value: 1,
         },
      ]);
      expect(elementsOf('Heavy Cover')).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'defense',
            value: 2,
         },
         {
            operation: 'flatModifier',
            selector: 'resistance',
            key: 'reflexes',
            value: 2,
         },
      ]);
      expect(elementsOf('Surprised')).toEqual([
         {
            operation: 'setSum',
            selector: 'rating',
            key: 'defense',
            value: 0,
            mode: 'set',
         },
      ]);
      expect(elementsOf('Dying')).toEqual([
         {
            operation: 'conditionalCheckModifier',
            modifierType: 'dice',
            checkType: 'any',
            selector: 'any',
            key: '',
            value: -1,
         },
      ]);
      expect(elementsOf('Last Stand')).toEqual([
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'melee',
            value: 1,
         },
         {
            operation: 'flatModifier',
            selector: 'rating',
            key: 'accuracy',
            value: 1,
         },
      ]);
   });
});
