import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderEquipment } from '~/spreadsheet/markdown/renderers/RenderEquipment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The system's real English localization map. */
const realLang = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../../lang/en.json'), 'utf-8'));

/**
 * Builds a render context wired to the system's real labels and a fresh slugger.
 * @returns {{labels: function(string, string=): string, slugFor: function(string): string}} The context.
 */
function realContext() {
   return {
      labels: createLabels(realLang),
      slugFor: createSlugger(),
   };
}

/**
 * Builds a minimal Equipment `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      value: 0,
      customTrait: [],
      check: [],
      description: '',
      ...overrides,
   };
}

describe('renderEquipment', () => {
   it('renders Rarity, Value, and custom traits only (no standard trait list)', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Grappling Hook',
         system: makeSystem({
            rarity: 'uncommon',
            value: 15,
            customTrait: [{
               name: 'Weighted',
               description: '',
            }],
            description: '<p>A hook on a length of rope.</p>',
         }),
      };

      expect(renderEquipment(document, realContext())).toBe(
         '#### ***Grappling Hook*** {#grappling-hook}\n\n'
         + '**Rarity:** Uncommon  \n**Value:** 15  \n**Traits:** Weighted  \n---\n\n'
         + 'A hook on a length of rope.  \n---',
      );
   });

   it('renders item checks after the common stat lines', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Alchemical Torch',
         system: makeSystem({
            value: 5,
            check: [{
               label: 'Ignite',
               attribute: 'mind',
               skill: 'arcana',
               difficulty: 4,
               complexity: 1,
               resolveCost: 0,
               isDamage: false,
               isHealing: false,
               scaling: true,
               resistanceCheck: 'none',
               initialValue: 1,
            }],
         }),
      };

      expect(renderEquipment(document, realContext())).toBe(
         '#### ***Alchemical Torch*** {#alchemical-torch}\n\n'
         + '**Value:** 5  \n**Ignite:** Mind (Arcana) 4:1  \n---\n\n---',
      );
   });

   it('renders zero stat lines as heading, blank line, ---', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Chalk',
         system: makeSystem(),
      };

      expect(renderEquipment(document, realContext())).toBe('#### ***Chalk*** {#chalk}\n\n---\n\n---');
   });
});
