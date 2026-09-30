import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {string} The absolute `src/` directory. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** @type {number} How many characters after a list call are searched for an `enabled` read in its callback. */
const CALLBACK_WINDOW = 160;

/**
 * Lists every `.svelte` file below a directory.
 * @param {string} directory - The absolute directory to walk.
 * @returns {string[]} The absolute component paths.
 */
function listComponents(directory) {
   return readdirSync(directory).flatMap((entry) => {
      /** @type {string} The entry's absolute path. */
      const entryPath = path.join(directory, entry);
      if (statSync(entryPath).isDirectory()) {
         return listComponents(entryPath);
      }
      return entryPath.endsWith('.svelte') ? [entryPath] : [];
   });
}

/**
 * Finds hand-rolled derivations of "the enabled Spell Aspects": a `filter`, `some` or `every` over a list named for
 * aspects whose callback reads `.enabled`, or an index read `aspect[idx].enabled`. The displayed-aspect rule lives in
 * `selectDisplayedSpellAspects`; components must call it instead.
 * @param {string} source - A component's source text.
 * @returns {string[]} The offending snippets.
 */
function findHandRolledEnabledAspectFilters(source) {
   /** @type {string[]} The offending snippets. */
   const found = [];

   for (const match of source.matchAll(/aspect\w*\s*\.\s*(?:filter|some|every)\s*\(/gi)) {
      /** @type {string} The call's opening and the start of its callback. */
      const snippet = source.slice(match.index, match.index + match[0].length + CALLBACK_WINDOW);
      if (/\.enabled\b/.test(snippet)) {
         found.push(snippet);
      }
   }

   for (const match of source.matchAll(/aspect\w*\[[^\]]+\]\s*\.enabled\b/gi)) {
      found.push(match[0]);
   }

   return found;
}

describe('findHandRolledEnabledAspectFilters', () => {
   it('flags filter, some, every and indexed reads of an aspect list that read .enabled', () => {
      expect(findHandRolledEnabledAspectFilters('aspect.filter((aspect) => aspect.enabled)')).toHaveLength(1);
      expect(findHandRolledEnabledAspectFilters('item.aspect.some((entry) => entry.enabled)')).toHaveLength(1);
      expect(findHandRolledEnabledAspectFilters('system.aspect\n   .every(\n(a) => a.enabled)')).toHaveLength(1);
      expect(findHandRolledEnabledAspectFilters('if (aspects[idx].enabled) {')).toHaveLength(1);
   });

   it('ignores list calls that do not read .enabled', () => {
      expect(findHandRolledEnabledAspectFilters('customAspect.filter((aspect) => aspect.cost > 0)')).toEqual([]);
      expect(findHandRolledEnabledAspectFilters('checks.filter((check) => check.enabled)')).toEqual([]);
   });
});

describe('Spell Aspect display selection', () => {
   /** @type {string[]} Every component under `src/`. */
   const components = listComponents(SOURCE_DIRECTORY);

   it('scans the components', () => {
      expect(components.length).toBeGreaterThan(100);
   });

   it('keeps every component off a hand-rolled enabled-aspect filter', () => {
      /** @type {string[]} One message per offending component. */
      const offenders = components
         .filter((file) => findHandRolledEnabledAspectFilters(readFileSync(file, 'utf-8')).length > 0)
         .map((file) => path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/'));

      expect(offenders).toEqual([]);
   });
});
