import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderAbility } from '~/spreadsheet/markdown/renderers/RenderAbility.js';

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
 * Builds a minimal Ability `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      xpCost: 2,
      action: false,
      reaction: false,
      passive: false,
      customTrait: [],
      check: [],
      description: '',
      ...overrides,
   };
}

describe('renderAbility', () => {
   it('reproduces the compendium Alert (common rarity, no flags, no traits: only the XP Cost line)', () => {
      /** @type {object} The Alert document fixture. */
      const document = {
         name: 'Alert',
         system: makeSystem({
            description: '<p>You are always ready for a fight and never caught off-guard.</p>',
         }),
      };

      expect(renderAbility(document, realContext())).toBe(
         '#### ***Alert*** {#alert}\n\n'
         + '**XP Cost:** 2  \n---\n\n'
         + 'You are always ready for a fight and never caught off-guard.  \n---',
      );
   });

   it('renders a nested-list description (A Cunning Plan)', () => {
      /** @type {object} The A Cunning Plan document fixture. */
      const document = {
         name: 'A Cunning Plan',
         system: makeSystem({
            description: '<p>There is no substitute for a good, solid plan.</p>'
               + '<ul><li>Make a plan.'
               + '<ul><li>Record the details.</li></ul>'
               + '</li></ul>',
         }),
      };

      expect(renderAbility(document, realContext())).toBe(
         '#### ***A Cunning Plan*** {#a-cunning-plan}\n\n'
         + '**XP Cost:** 2  \n---\n\n'
         + 'There is no substitute for a good, solid plan.\n\n'
         + '* Make a plan.\n'
         + '  * Record the details.  \n---',
      );
   });

   it('renders Rarity and every true Type flag, in Action/Reaction/Passive order', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Quick Reflexes',
         system: makeSystem({
            rarity: 'uncommon',
            action: true,
            passive: true,
         }),
      };

      expect(renderAbility(document, realContext())).toBe(
         '#### ***Quick Reflexes*** {#quick-reflexes}\n\n'
         + '**Rarity:** Uncommon  \n**XP Cost:** 2  \n**Type:** Action, Passive  \n---\n\n---',
      );
   });

   it('renders custom traits and item checks', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Path of the Arbiter',
         system: makeSystem({
            customTrait: [
               {
                  name: 'Path',
                  description: '' 
               },
               {
                  name: 'Arbiter',
                  description: '' 
               },
            ],
            check: [{
               label: 'Sense Corruption',
               attribute: 'mind',
               skill: 'perception',
               difficulty: 4,
               complexity: 1,
               resolveCost: 0,
               isDamage: false,
               isHealing: false,
               scaling: false,
               resistanceCheck: 'none',
               initialValue: 0,
            }],
         }),
      };

      expect(renderAbility(document, realContext())).toBe(
         '#### ***Path of the Arbiter*** {#path-of-the-arbiter}\n\n'
         + '**XP Cost:** 2  \n**Traits:** Path, Arbiter  \n'
         + '**Sense Corruption:** Mind (Perception) 4:1  \n---\n\n---',
      );
   });
});
