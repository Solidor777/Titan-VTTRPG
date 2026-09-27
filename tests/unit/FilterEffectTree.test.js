import { describe, expect, it } from 'vitest';
import filterEffectTree from '../../src/sidebar/tray/FilterEffectTree.js';

/**
 * Builds a folder node.
 * @param {string} name - The folder name, also used as its uuid.
 * @param {object[]} [children] - The nested folder nodes.
 * @param {object[]} [effects] - The effects directly inside the folder.
 * @returns {object} The folder node.
 */
function node(name, children = [], effects = []) {
   return {
      folder: {
         name,
         uuid: name,
      },
      depth: 1,
      children,
      effects,
   };
}

/**
 * Builds an effect stub.
 * @param {string} name - The name the search matches against.
 * @returns {{ name: string }} The effect stub.
 */
function effect(name) {
   return { name };
}

/**
 * The fixture tree: Sacred Arts > White Fox > Abilities (Fox Fire, Fox Form), plus Spells > Air (Air Walk)
 * and a root effect.
 * @returns {object} The tree.
 */
function fixture() {
   return {
      children: [
         node('Sacred Arts', [
            node('White Fox', [
               node('Abilities', [], [
                  effect('Fox Fire'),
                  effect('Fox Form'),
               ]),
            ]),
         ]),
         node('Spells', [
            node('Air', [], [effect('Air Walk')]),
         ]),
      ],
      effects: [effect('Dodging')],
   };
}

/**
 * Builds a case-insensitive name predicate.
 * @param {string} query - The search text.
 * @returns {(named: { name: string }) => boolean} The predicate.
 */
function named(query) {
   return (document) => document.name.toLowerCase().includes(query.toLowerCase());
}

/**
 * Lists a pruned tree as indented names, folders and effects, for readable assertions.
 * @param {object} tree - The pruned tree.
 * @returns {string[]} One line per folder or effect.
 */
function outline(tree) {
   /** @type {string[]} The collected lines. */
   const lines = [];

   /**
    * Appends a node and its contents.
    * @param {object} current - The node.
    * @param {number} depth - The indentation depth.
    * @returns {void}
    */
   const visit = (current, depth) => {
      lines.push(`${'  '.repeat(depth)}[${current.folder.name}]`);
      current.children.forEach((child) => visit(child, depth + 1));
      current.effects.forEach((item) => lines.push(`${'  '.repeat(depth + 1)}${item.name}`));
   };
   tree.children.forEach((child) => visit(child, 0));
   tree.effects.forEach((item) => lines.push(item.name));
   return lines;
}

describe('filterEffectTree', () => {
   it('keeps a matching effect inside its full folder chain and expands the chain', () => {
      const { tree, autoExpand } = filterEffectTree(fixture(), named('fox form'), named('fox form'));
      expect(outline(tree)).toEqual([
         '[Sacred Arts]',
         '  [White Fox]',
         '    [Abilities]',
         '      Fox Form',
      ]);
      expect([...autoExpand].sort()).toEqual([
         'Abilities',
         'Sacred Arts',
         'White Fox',
      ]);
   });

   it('keeps a matching folder with its direct effects without expanding it, but expands its ancestors', () => {
      const { tree, autoExpand } = filterEffectTree(fixture(), named('air'), () => false);
      expect(outline(tree)).toEqual([
         '[Spells]',
         '  [Air]',
         '    Air Walk',
      ]);
      expect([...autoExpand]).toEqual(['Spells']);
   });

   it('drops subfolders of a matching folder that hold no match themselves', () => {
      const { tree } = filterEffectTree(fixture(), named('white fox'), () => false);
      expect(outline(tree)).toEqual([
         '[Sacred Arts]',
         '  [White Fox]',
      ]);
   });

   it('filters root effects and removes folders with no match', () => {
      const { tree, autoExpand } = filterEffectTree(fixture(), named('dodg'), named('dodg'));
      expect(outline(tree)).toEqual(['Dodging']);
      expect(autoExpand.size).toBe(0);
   });
});
