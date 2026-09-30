import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import createSpellSheetData from '~/document/types/item/types/spell/sheet/SpellSheetData.js';

/** @type {string} The Spell sheet components' directory. */
const SHEET_DIRECTORY = path.resolve(
   path.dirname(fileURLToPath(import.meta.url)),
   '../../src/document/types/item/types/spell/sheet',
);

/** @type {object} Initial Spell sheet state, built from a minimal Item stand-in. */
const SHEET_DATA = createSpellSheetData({
   type: 'spell',
   system: {
      check: [],
      customAspect: [],
   },
});

/**
 * Every `$appState.tabs|sidebar.<section>.<key>` path the Spell sheet components read or bind, paired with its file.
 * A path outside the initial state silently creates a new key on write, so a typo loses the typed, initialised state.
 * @type {{ file: string, section: string, group: string, key: string }[]}
 */
const STATE_PATHS = readdirSync(SHEET_DIRECTORY)
   .filter((fileName) => fileName.endsWith('.svelte'))
   .flatMap((fileName) => [...readFileSync(path.join(SHEET_DIRECTORY, fileName), 'utf-8')
      .matchAll(/\$appState\.(tabs|sidebar)\.(\w+)\.(\w+)/g)]
      .map((match) => ({
         file: fileName,
         section: match[1],
         group: match[2],
         key: match[3],
      })));

describe('Spell sheet application state paths', () => {
   it('finds state paths in the sheet components', () => {
      expect(STATE_PATHS.length).toBeGreaterThan(5);
   });

   it.each(STATE_PATHS.map((entry) => [
      entry.file,
      `${entry.section}.${entry.group}.${entry.key}`,
      entry,
   ]))('%s uses %s, which the initial sheet data defines', (file, label, entry) => {
      expect(Object.keys(SHEET_DATA[entry.section][entry.group])).toContain(entry.key);
   });
});
