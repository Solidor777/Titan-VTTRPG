import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderShield } from '~/spreadsheet/markdown/renderers/RenderShield.js';

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
 * Builds a minimal Shield `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      value: 0,
      defense: 0,
      trait: [],
      customTrait: [],
      check: [],
      description: '',
      ...overrides,
   };
}

describe('renderShield', () => {
   it('reproduces the compendium Shield (Value, signed Defense Bonus)', () => {
      /** @type {object} The Shield document fixture. */
      const document = {
         name: 'Shield',
         system: makeSystem({
            value: 180,
            defense: 1,
            description: '<p>Though they come in a variety of shapes and sizes, the protection offered by '
               + 'shields comes from the sturdiness of their materials.</p>',
         }),
      };

      expect(renderShield(document, realContext())).toBe(
         '#### ***Shield*** {#shield}\n\n'
         + '**Value:** 180  \n**Defense Bonus:** \\+1  \n---\n\n'
         + 'Though they come in a variety of shapes and sizes, the protection offered by shields comes from '
         + 'the sturdiness of their materials.  \n---',
      );
   });

   it('omits the Defense Bonus line when defense is zero', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Buckler',
         system: makeSystem({ value: 40 }),
      };

      expect(renderShield(document, realContext())).toBe(
         '#### ***Buckler*** {#buckler}\n\n**Value:** 40  \n---\n\n---',
      );
   });

   it('combines standard and custom traits, and renders item checks', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Aegis',
         system: makeSystem({
            defense: 2,
            trait: [{ name: 'magical', value: true }],
            customTrait: [{ name: 'Blessed', description: '' }],
            check: [{
               label: 'Ward',
               attribute: 'soul',
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

      expect(renderShield(document, realContext())).toBe(
         '#### ***Aegis*** {#aegis}\n\n'
         + '**Defense Bonus:** \\+2  \n**Traits:** Magical, Blessed  \n**Ward:** Soul (Arcana) 4:1  \n---\n\n---',
      );
   });
});
