import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** @type {string} The absolute `src/` directory. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** @type {RegExp} Marks a component that deals with Spell Aspects: it mentions aspects in any casing. */
const ASPECT_MARKER = /aspect/i;

/** @type {RegExp} Matches a member read of `enabled`: `x.enabled`, `x?.enabled`, or `x['enabled']`. */
const MEMBER_READ = /\??\.\s*enabled\b|\[\s*(['"`])enabled\1\s*\]/g;

/**
 * Matches a brace group in a destructuring (binding) position. Group 1 is the pattern's content. Covered positions:
 * a declaration or assignment (`{ … } =`), a `for … of`/`in` head, an arrow-function parameter (`({ … }) =>`,
 * `({ … }, idx) =>`), a function or method parameter (`({ … }) {`), a Svelte `{#each … as { … }}` item,
 * `{:then { … }}`/`{:catch { … }}`, and `{#snippet name({ … })}`.
 * @type {RegExp}
 */
const DESTRUCTURING_PATTERN = new RegExp([
   String.raw`(?:\bas\s*|\{:(?:then|catch)\s*|\{#snippet\s+[\w$]+\s*\(\s*)\{([^{}]*)\}`,
   String.raw`\{([^{}]*)\}(?=\s*=(?![=>])|\s+(?:of|in)\b|\s*(?:,[^(){}]*)?\)\s*(?:=>|\{))`,
].join('|'), 'g');

/** @type {RegExp} Matches `enabled` as a key of a destructuring pattern's content (plain, renamed, or defaulted). */
const ENABLED_KEY = /(?:^|[\s,])enabled\s*(?:[,:=]|$)/;

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
 * Removes the parts of a component that are not script or markup code: `<style>` blocks, HTML comments, and
 * JavaScript block and line comments. A CSS class or a comment that names `enabled` is not a read.
 * @param {string} source - A component's source text.
 * @returns {string} The source without styles and comments.
 */
function stripNonCode(source) {
   return source
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:\w])\/\/.*$/gm, '$1');
}

/**
 * Finds every read of an `enabled` field or binding in a component: a member read (`a.enabled`, `a?.enabled`,
 * `a['enabled']`) or an `enabled` key in a destructuring pattern. Which Spell Aspects are displayed is decided by
 * `selectDisplayedSpellAspects` alone, so a component that deals with aspects reads none of these.
 * @param {string} source - A component's source text.
 * @returns {string[]} The offending snippets.
 */
function findEnabledReads(source) {
   /** @type {string} The component's script and markup code. */
   const code = stripNonCode(source);

   /** @type {string[]} Each `.enabled`, `?.enabled` or `['enabled']` access in the code. */
   const memberReads = [...code.matchAll(MEMBER_READ)].map((match) => match[0]);

   /** @type {string[]} The destructuring patterns that bind `enabled`. */
   const destructured = [...code.matchAll(DESTRUCTURING_PATTERN)]
      .filter((match) => ENABLED_KEY.test(match[1] ?? match[2]))
      .map((match) => match[0]);

   return [
      ...memberReads,
      ...destructured,
   ];
}

describe('findEnabledReads', () => {
   it('flags member reads in markup, loops and list callbacks', () => {
      expect(findEnabledReads('{#each aspects as a}{#if a.enabled}<Tag/>{/if}{/each}')).toHaveLength(1);
      expect(findEnabledReads('for (const a of aspects) {\n   if (a.enabled) {\n      count++;\n   }\n}'))
         .toHaveLength(1);
      expect(findEnabledReads('const first = aspects.find((a) => a.enabled);')).toHaveLength(1);
      expect(findEnabledReads('aspects.filter((a) => a?.enabled)')).toHaveLength(1);
      expect(findEnabledReads('if (aspect[idx][\'enabled\']) {')).toHaveLength(1);
   });

   it('flags enabled bound by a destructuring pattern', () => {
      expect(findEnabledReads('const { enabled } = aspect;')).toHaveLength(1);
      expect(findEnabledReads('const { label, enabled: isOn = false } = aspect;')).toHaveLength(1);
      expect(findEnabledReads('for (const { enabled, cost } of aspects) {')).toHaveLength(1);
      expect(findEnabledReads('aspects.filter(({ enabled }) => enabled)')).toHaveLength(1);
      expect(findEnabledReads('aspects.map(({ enabled }, idx) => idx)')).toHaveLength(1);
      expect(findEnabledReads('function isShown({ enabled }) {\n   return true;\n}')).toHaveLength(1);
      expect(findEnabledReads('{#each aspects as { enabled, label }}{label}{/each}')).toHaveLength(1);
      expect(findEnabledReads('{#snippet row({ enabled })}{/snippet}')).toHaveLength(1);
   });

   it('ignores child props, object literals, look-alike names, styles and comments', () => {
      expect(findEnabledReads('<ToggleOptionButton enabled={isOn}/>')).toEqual([]);
      expect(findEnabledReads('toggle({ enabled: true });')).toEqual([]);
      expect(findEnabledReads('const shown = aspect.isEnabled || aspect.enabledCount > 0;')).toEqual([]);
      expect(findEnabledReads('<style lang="scss">\n   .tag.enabled {\n      color: red;\n   }\n</style>')).toEqual([]);
      expect(findEnabledReads('<!--Hides a.enabled aspects-->\n// a.enabled\n/** a.enabled */')).toEqual([]);
   });
});

describe('Spell Aspect display selection', () => {
   /** @type {Map<string, string>} Every component under `src/` that deals with aspects: relative path to source. */
   const aspectComponents = new Map(
      listComponents(SOURCE_DIRECTORY)
         .map((file) => [
            path.relative(SOURCE_DIRECTORY, file).replaceAll('\\', '/'),
            readFileSync(file, 'utf-8'),
         ])
         .filter(([, source]) => ASPECT_MARKER.test(source)),
   );

   it('finds the components that deal with aspects, including every caller of the shared selector', () => {
      /** @type {string[]} The components that call `selectDisplayedSpellAspects`. */
      const selectorCallers = [...aspectComponents.entries()]
         .filter(([, source]) => source.includes('selectDisplayedSpellAspects('))
         .map(([file]) => file);

      expect(aspectComponents.size).toBeGreaterThan(15);
      expect(selectorCallers.length).toBeGreaterThan(4);
      expect([...aspectComponents.keys()]).toContain('helpers/svelte-components/tag/SpellAspectTags.svelte');
   });

   it('keeps every component that deals with aspects from reading enabled', () => {
      /** @type {string[]} One message per offending component. */
      const offenders = [...aspectComponents.entries()]
         .map(([file, source]) => ({
            file,
            reads: findEnabledReads(source),
         }))
         .filter(({ reads }) => reads.length > 0)
         .map(({ file, reads }) => `${file}: ${reads.join(' | ')}`);

      expect(offenders).toEqual([]);
   });
});
