import { describe, expect, it } from 'vitest';
import { buildCompendiumTree } from '~/spreadsheet/markdown/CompendiumTree.js';

/**
 * A label resolver that always returns the fallback, matching a lang file with no overrides.
 * @param {string} _key - Unused.
 * @param {string} [fallback] - The value to return.
 * @returns {string} `fallback`.
 */
function labels(_key, fallback) {
   return fallback;
}

/**
 * Builds a minimal `RenderableDocument` fixture.
 * @param {string} type - The Item subtype.
 * @param {string} name - The document's name.
 * @param {string[]} [folderPath] - The document's folder path segments.
 * @param {object} [system] - The document's `system` data.
 * @returns {object} The fixture.
 */
function makeDoc(type, name, folderPath = [], system = {}) {
   return {
      type,
      name,
      folderPath,
      system,
   };
}

describe('buildCompendiumTree', () => {
   it('groups three unfoldered types as root type-group sections in TYPE_ORDER', () => {
      /** @type {object[]} An armor, a weapon, and a spell, all unfoldered. */
      const documents = [
         makeDoc('armor', 'Plate'),
         makeDoc('weapon', 'Sword'),
         makeDoc('spell', 'Light', [], { tradition: '' }),
      ];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      expect(tree.sections.map((s) => s.text)).toEqual([
         'Weapons',
         'Armor',
         'Spells',
      ]);
      expect(tree.sections[0].level).toBe(1);
      expect(tree.sections[0].documents).toEqual([documents[1]]);
      expect(tree.sections[1].documents).toEqual([documents[0]]);
      expect(tree.sections[2].documents).toEqual([documents[2]]);
   });

   it('renders a three-level folder chain with the leaf documents at the innermost level', () => {
      /** @type {object[]} A weapon nested three folders deep. */
      const documents = [makeDoc('weapon', 'Sword', [
         'Equipment',
         'Weapons',
         'Melee Weapons',
      ])];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      expect(tree.sections).toHaveLength(1);
      /** @type {object} The root `Equipment` folder section. */
      const equipmentSection = tree.sections[0];
      expect(equipmentSection).toMatchObject({
         level: 1,
         text: 'Equipment',
         documents: [],
      });

      /** @type {object} The `Weapons` subfolder section. */
      const weaponsSection = equipmentSection.children[0];
      expect(weaponsSection).toMatchObject({
         level: 2,
         text: 'Weapons',
         documents: [],
      });

      /** @type {object} The `Melee Weapons` leaf folder section. */
      const meleeSection = weaponsSection.children[0];
      expect(meleeSection).toMatchObject({
         level: 3,
         text: 'Melee Weapons',
         documents: [documents[0]],
      });
   });

   it('partitions a mixed-type folder leaf into type groups one level below the folder', () => {
      /** @type {object[]} An armor and a weapon sharing one folder. */
      const documents = [
         makeDoc('armor', 'Plate', ['Urderic Equipment']),
         makeDoc('weapon', 'Sword', ['Urderic Equipment']),
      ];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      expect(tree.sections).toHaveLength(1);
      /** @type {object} The `Urderic Equipment` folder section. */
      const folderSection = tree.sections[0];
      expect(folderSection).toMatchObject({
         level: 1,
         text: 'Urderic Equipment',
         documents: [],
      });
      expect(folderSection.children.map((c) => ({
         level: c.level,
         text: c.text,
         documents: c.documents,
      }))).toEqual([
         {
            level: 2,
            text: 'Weapons',
            documents: [documents[1]],
         },
         {
            level: 2,
            text: 'Armor',
            documents: [documents[0]],
         },
      ]);
   });

   it('partitions unfoldered spells by tradition, blank tradition first and headingless', () => {
      /** @type {object[]} Two traditions plus one blank-tradition spell, unfoldered. */
      const documents = [
         makeDoc('spell', 'Light', [], { tradition: '' }),
         makeDoc('spell', 'Blast', [], { tradition: 'fire' }),
         makeDoc('spell', 'Air Walk', [], { tradition: 'air' }),
      ];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      expect(tree.sections).toHaveLength(1);
      /** @type {object} The root `Spells` section. */
      const spellsSection = tree.sections[0];
      expect(spellsSection).toMatchObject({
         level: 1,
         text: 'Spells',
         documents: [documents[0]],
      });
      expect(spellsSection.children.map((c) => ({
         level: c.level,
         text: c.text,
         documents: c.documents,
      }))).toEqual([
         {
            level: 3,
            text: 'Air',
            documents: [documents[2]],
         },
         {
            level: 3,
            text: 'Fire',
            documents: [documents[1]],
         },
      ]);
   });

   it('never partitions foldered spells by tradition', () => {
      /** @type {object[]} Two spells with different traditions, both in the same folder. */
      const documents = [
         makeDoc('spell', 'Blast', ['Magic'], { tradition: 'fire' }),
         makeDoc('spell', 'Air Walk', ['Magic'], { tradition: 'air' }),
      ];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      expect(tree.sections).toHaveLength(1);
      expect(tree.sections[0]).toMatchObject({
         level: 1,
         text: 'Magic',
         children: [],
         documents: [
            documents[1],
            documents[0],
         ],
      });
   });

   it('clamps a depth-4 folder heading to H3', () => {
      /** @type {object[]} A commodity nested four folders deep. */
      const documents = [makeDoc('commodity', 'Rope', [
         'A',
         'B',
         'C',
         'D',
      ])];

      /** @type {{sections: object[]}} The built tree. */
      const tree = buildCompendiumTree(documents, labels);

      /** @type {object} Walks down to the depth-4 `D` folder section. */
      const depth4Section = tree.sections[0].children[0].children[0].children[0];
      expect(depth4Section).toMatchObject({
         level: 3,
         text: 'D',
         documents: [documents[0]],
      });
   });
});
