import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse, preprocess } from 'svelte/compiler';

/** @type {string} The absolute `src/` directory. */
const SOURCE_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

/** @type {RegExp} Marks a component that deals with Spell Aspects: it mentions aspects in any casing. */
const ASPECT_MARKER = /aspect/i;

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
 * Tests whether a property key names `enabled`: a non-computed identifier, a string literal, or a template literal
 * with no expressions.
 * @param {object} key - The ESTree key or property node.
 * @param {boolean} computed - Whether the key is written in brackets.
 * @returns {boolean} True when the key is `enabled`.
 */
function isEnabledKey(key, computed) {
   return (!computed && key.type === 'Identifier' && key.name === 'enabled')
      || (key.type === 'Literal' && key.value === 'enabled')
      || (key.type === 'TemplateLiteral' && key.quasis.length === 1
         && key.quasis[0].value.cooked === 'enabled');
}

/**
 * Finds every read of an `enabled` field in a component by walking its Svelte AST (instance and module scripts, and
 * every template expression and binding pattern): a member read (`a.enabled`, `a?.enabled`, `a['enabled']`) or an
 * `enabled` key in an object destructuring pattern at any depth, including patterns nested in arrays and patterns in
 * `{#each}`, `{#snippet}`, `{:then}` and `{@const}`. Passing an `enabled=` attribute to a child is a value in, not a
 * read, and strings and comments are not code, so none of those match. Which Spell Aspects are displayed is decided
 * by `selectDisplayedSpellAspects` alone, so a component that deals with aspects reads none of these. `<style>`
 * contents are blanked to spaces by a Svelte style preprocessor before parsing: they are SCSS, which the CSS parser
 * rejects, and hold no script reads; blanking keeps every offset, so reported lines match the file.
 * @param {string} componentSource - A component's source text.
 * @returns {Promise<string[]>} One description per read, with its line.
 */
async function findEnabledReads(componentSource) {
   /** @type {string} The component with every `<style>` block's content blanked to spaces, line breaks kept. */
   const source = (await preprocess(componentSource, {
      style: ({ content }) => ({ code: content.replace(/[^\n]/g, ' ') }),
   })).code;

   /** @type {string[]} The reads found. */
   const found = [];

   /**
    * Describes a node's position as a line number.
    * @param {object} node - An AST node with a `start` offset.
    * @returns {string} The one-based line of the node.
    */
   const lineOf = (node) => `line ${source.slice(0, node.start).split('\n').length}`;

   /** @type {Set<object>} The AST objects already visited; guards against shared or cyclic references. */
   const visited = new Set();

   /** @type {unknown[]} The AST values still to visit. */
   const pending = [parse(source, { modern: true })];
   while (pending.length > 0) {
      /** @type {unknown} The value to visit next. */
      const node = pending.pop();
      if (node === null || typeof node !== 'object' || visited.has(node)) {
         continue;
      }
      visited.add(node);

      if (node.type === 'MemberExpression' && isEnabledKey(node.property, node.computed)) {
         found.push(`member read of enabled at ${lineOf(node)}`);
      }
      if (node.type === 'ObjectPattern') {
         for (const property of node.properties) {
            if (property.type === 'Property' && isEnabledKey(property.key, property.computed)) {
               found.push(`destructured enabled at ${lineOf(property)}`);
            }
         }
      }

      pending.push(...Object.values(node));
   }

   return found;
}

/**
 * Wraps script code in an instance `<script>` block so it parses as a component.
 * @param {string} code - The script body.
 * @returns {string} The component source.
 */
function script(code) {
   return `<script>\n${code}\n</script>`;
}

describe('findEnabledReads', () => {
   it('flags member reads in markup, loops and list callbacks', async () => {
      expect(await findEnabledReads('{#each aspects as a}{#if a.enabled}<Tag/>{/if}{/each}')).toHaveLength(1);
      expect(await findEnabledReads(script('for (const a of aspects) {\n   if (a.enabled) {\n      count++;\n   }\n}')))
         .toHaveLength(1);
      expect(await findEnabledReads(script('const first = aspects.find((a) => a.enabled);'))).toHaveLength(1);
      expect(await findEnabledReads(script('aspects.filter((a) => a?.enabled);'))).toHaveLength(1);
      expect(await findEnabledReads(script('const on = a[\'enabled\'];'))).toHaveLength(1);
      expect(await findEnabledReads(script('const on = a[`enabled`];'))).toHaveLength(1);
      expect(await findEnabledReads('{#each aspects as a}{@const on = a.enabled}{on}{/each}')).toHaveLength(1);
   });

   it('flags enabled bound by a destructuring pattern at any depth', async () => {
      expect(await findEnabledReads(script('const { enabled } = aspect;'))).toHaveLength(1);
      expect(await findEnabledReads(script('const { label, enabled: isOn = false } = aspect;'))).toHaveLength(1);
      expect(await findEnabledReads(script('for (const { enabled, cost } of aspects) {\n}'))).toHaveLength(1);
      expect(await findEnabledReads(script('aspects.filter(({ enabled }) => enabled);'))).toHaveLength(1);
      expect(await findEnabledReads(script('function isShown({ enabled }) {\n   return enabled;\n}'))).toHaveLength(1);
      expect(await findEnabledReads('{#each aspects as { enabled, label }}{label}{/each}')).toHaveLength(1);
      expect(await findEnabledReads('{#snippet row({ enabled })}{/snippet}')).toHaveLength(1);
      expect(await findEnabledReads('{#await load()}{:then { enabled }}{/await}')).toHaveLength(1);
      expect(await findEnabledReads(script('const { aspect: { enabled } } = entry;'))).toHaveLength(1);
      expect(await findEnabledReads('{#each list as { aspect: { enabled } }}{/each}')).toHaveLength(1);
      expect(await findEnabledReads(script('list.filter(({ aspect: { enabled } }) => enabled);'))).toHaveLength(1);
      expect(await findEnabledReads(script('const [{ enabled }] = aspects;'))).toHaveLength(1);
      expect(await findEnabledReads(script('const { \'enabled\': isOn } = aspect;'))).toHaveLength(1);
      /** @type {string} A template that destructures `enabled` in an `{@const}` tag. */
      const constDestructFixture = '{#each items as item}{@const { enabled } = item}{enabled}{/each}';
      expect(await findEnabledReads(constDestructFixture)).toHaveLength(1);
   });

   it('ignores a child enabled attribute, object literals, look-alikes, strings, styles and comments', async () => {
      expect(await findEnabledReads('<ToggleOptionButton enabled={isOn}/>')).toEqual([]);
      expect(await findEnabledReads(script('toggle({ enabled: true });'))).toEqual([]);
      expect(await findEnabledReads(script('const shown = aspect.isEnabled || aspect.enabledCount > 0;'))).toEqual([]);
      expect(await findEnabledReads(script('const text = \'a.enabled\';\nconst key = "enabled";'))).toEqual([]);
      expect(await findEnabledReads('<style>\n   .tag.enabled {\n      color: red;\n   }\n</style>')).toEqual([]);
      expect(await findEnabledReads(`<!--Hides a.enabled aspects-->${script('// a.enabled\n/** a.enabled */')}`))
         .toEqual([]);
   });

   it('keeps line numbers correct when blanking SCSS comments in <style> blocks', async () => {
      /** @type {string} A multi-line component with an SCSS-commented line before a script read. */
      const fixture = `<style lang="scss">
   // some scss comment here
   .tag {
      color: red;
   }
</style>
<script>
   const x = y.enabled;
</script>`;

      /** @type {string[]} The reported reads. */
      const reads = await findEnabledReads(fixture);

      expect(reads).toHaveLength(1);
      expect(reads[0]).toBe('member read of enabled at line 8');
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

   it('keeps every component that deals with aspects from reading enabled', async () => {
      /** @type {string[]} One message per offending component. */
      const offenders = (await Promise.all([...aspectComponents.entries()]
         .map(async ([file, source]) => ({
            file,
            reads: await findEnabledReads(source),
         }))))
         .filter(({ reads }) => reads.length > 0)
         .map(({ file, reads }) => `${file}: ${reads.join(' | ')}`);

      expect(offenders).toEqual([]);
   });
});
