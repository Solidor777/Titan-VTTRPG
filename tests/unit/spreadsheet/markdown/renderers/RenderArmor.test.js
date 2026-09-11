import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderArmor } from '~/spreadsheet/markdown/renderers/RenderArmor.js';

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
 * Builds a minimal Armor `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      value: 0,
      armor: {
         max: 1,
         value: 1,
      },
      trait: [],
      customTrait: [],
      check: [],
      description: '',
      ...overrides,
   };
}

describe('renderArmor', () => {
   it('reproduces the compendium Heavy Armor (Loud, Heavy traits)', () => {
      /** @type {object} The Heavy Armor document fixture. */
      const document = {
         name: 'Heavy Armor',
         system: makeSystem({
            value: 350,
            armor: {
               max: 3,
               value: 3,
            },
            trait: [
               { name: 'loud', value: true },
               { name: 'heavy', value: true },
            ],
            description: '<p>Heavy armor is made from interlocking metal plates, often overlaid with itself to '
               + 'provide multiple layers of protection. It is cumbersome to wear, but offers the greatest '
               + 'degree of protection.</p>',
         }),
      };

      expect(renderArmor(document, realContext())).toBe(
         '#### ***Heavy Armor*** {#heavy-armor}\n\n'
         + '**Value:** 350  \n**Armor:** 3  \n**Traits:** Loud, Heavy  \n---\n\n'
         + 'Heavy armor is made from interlocking metal plates, often overlaid with itself to provide '
         + 'multiple layers of protection. It is cumbersome to wear, but offers the greatest degree of '
         + 'protection.  \n---',
      );
   });

   it('omits the Traits line with no standard or custom traits, and renders Rarity when not common', () => {
      /** @type {object} The Light Armor document fixture. */
      const document = {
         name: 'Light Armor',
         system: makeSystem({
            rarity: 'uncommon',
            value: 120,
            armor: {
               max: 1,
               value: 1,
            },
         }),
      };

      expect(renderArmor(document, realContext())).toBe(
         '#### ***Light Armor*** {#light-armor}\n\n'
         + '**Rarity:** Uncommon  \n**Value:** 120  \n**Armor:** 1  \n---\n\n---',
      );
   });

   it('combines standard and custom traits, and renders item checks', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Warded Plate',
         system: makeSystem({
            trait: [{ name: 'magical', value: true }],
            customTrait: [{ name: 'Warded', description: '' }],
            check: [{
               label: 'Reflect',
               attribute: 'body',
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

      expect(renderArmor(document, realContext())).toBe(
         '#### ***Warded Plate*** {#warded-plate}\n\n'
         + '**Armor:** 1  \n**Traits:** Magical, Warded  \n**Reflect:** Body (Arcana) 4:1  \n---\n\n---',
      );
   });
});
