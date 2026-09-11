import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderCommodity } from '~/spreadsheet/markdown/renderers/RenderCommodity.js';

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

describe('renderCommodity', () => {
   it('renders Rarity and Value only, ignoring quantity', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Iron Ore',
         system: {
            rarity: 'uncommon',
            value: 5,
            quantity: 20,
            description: '<p>A chunk of raw ore.</p>',
         },
      };

      expect(renderCommodity(document, realContext())).toBe(
         '#### ***Iron Ore*** {#iron-ore}\n\n'
         + '**Rarity:** Uncommon  \n**Value:** 5  \n---\n\n'
         + 'A chunk of raw ore.  \n---',
      );
   });

   it('renders zero stat lines as heading, blank line, ---', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Rations',
         system: {
            rarity: 'common',
            value: 0,
            quantity: 1,
            description: '',
         },
      };

      expect(renderCommodity(document, realContext())).toBe('#### ***Rations*** {#rations}\n\n---\n\n---');
   });
});
