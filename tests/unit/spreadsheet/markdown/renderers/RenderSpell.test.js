import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderSpell } from '~/spreadsheet/markdown/renderers/RenderSpell.js';

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
 * Builds a `range` standard-aspect entry, defaulting the fields `calculateSpellAspectCosts` reads.
 * @param {string|number} initialValue - The range's initial value (`'self'`, `'touch'`, or a number).
 * @returns {object} The aspect entry.
 */
function rangeAspect(initialValue) {
   return {
      label: 'range',
      initialValue,
      option: [],
      resistanceCheck: 'none',
      allOptions: false,
   };
}

/**
 * Builds a `radius` standard-aspect entry, defaulting the fields `calculateSpellAspectCosts` reads.
 * @param {number} initialValue - The radius's initial value.
 * @returns {object} The aspect entry.
 */
function radiusAspect(initialValue) {
   return {
      label: 'radius',
      initialValue,
      option: [],
      resistanceCheck: 'none',
      allOptions: false,
   };
}

/**
 * Builds a `damage` standard-aspect entry, defaulting the fields `calculateSpellAspectCosts` reads.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The aspect entry.
 */
function damageAspect(overrides = {}) {
   return {
      label: 'damage',
      initialValue: 1,
      option: [],
      resistanceCheck: 'none',
      allOptions: false,
      ...overrides,
   };
}

/**
 * Builds an `extraTargets` standard-aspect entry, defaulting the fields `calculateSpellAspectCosts` reads.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The aspect entry.
 */
function extraTargetsAspect(overrides = {}) {
   return {
      label: 'extraTargets',
      initialValue: 1,
      resistanceCheck: 'none',
      ...overrides,
   };
}

/**
 * Builds a `duration` standard-aspect entry, defaulting the fields `calculateSpellAspectCosts` reads.
 * @param {string} unit - The duration unit (`'rounds'` or `'minutes'`).
 * @param {number} initialValue - The duration's initial value.
 * @returns {object} The aspect entry.
 */
function durationAspect(unit, initialValue) {
   return {
      label: 'duration',
      initialValue,
      unit,
      resistanceCheck: 'none',
   };
}

/**
 * Builds a scaling custom-aspect entry, defaulting the fields the renderer reads.
 * @param {string} label - The free-form aspect label.
 * @param {number} initialValue - The aspect's initial value.
 * @param {number} cost - The aspect's per-increment cost.
 * @returns {object} The custom aspect entry.
 */
function scalingCustomAspect(label, initialValue, cost) {
   return {
      label,
      scaling: true,
      initialValue,
      cost,
      resistanceCheck: 'none',
      isDamage: false,
      isHealing: false,
   };
}

/**
 * Builds a minimal Spell `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      xpCost: 2,
      tradition: '',
      castingCheck: {
         attribute: 'mind',
         skill: 'arcana',
         difficulty: 4,
         complexity: 1,
         autoCalculateDC: true,
      },
      aspect: [],
      customAspect: [],
      customTrait: [],
      description: '',
      ...overrides,
   };
}

describe('renderSpell', () => {
   it('reproduces the compendium Blast (Range, Area, Enhancements, Traits; stored 6:1 DC)', () => {
      // The compendium's stored 6:1 DC exceeds what calculateSpellAspectCosts' formula can ever
      // suggest (difficulty caps at 5); published spells commonly hand-tune the DC, i.e.
      // autoCalculateDC is false. That is what is modeled here.
      /** @type {object} The Blast document fixture. */
      const document = {
         name: 'Blast',
         system: makeSystem({
            xpCost: 2,
            tradition: 'Any',
            castingCheck: {
               attribute: 'mind',
               skill: 'arcana',
               difficulty: 6,
               complexity: 1,
               autoCalculateDC: false,
            },
            aspect: [
               rangeAspect(10),
               radiusAspect(5),
               damageAspect({ initialValue: 1 }),
            ],
            description: '<p>You gather your power and blast an area with your magic.</p>',
         }),
      };

      expect(renderSpell(document, realContext())).toBe(
         '#### ***Blast*** {#blast}\n\n'
         + '**Mind (Arcana) 6:1**  \n**XP Cost:** 2  \n'
         + '**Range:** 10 spaces  \n**Area:** 5-space-radius  \n'
         + '**Enhancements:** Damage (1 \\+ ES)  \n**Traits:** Any  \n---\n\n'
         + 'You gather your power and blast an area with your magic.  \n---',
      );
   });

   it('renders a custom scaling aspect\'s Enhancements entry with the "/ cost" suffix (Air Walk)', () => {
      /** @type {object} The Air Walk document fixture. */
      const document = {
         name: 'Air Walk',
         system: makeSystem({
            xpCost: 2,
            tradition: 'Air',
            castingCheck: {
               attribute: 'mind',
               skill: 'arcana',
               difficulty: 6,
               complexity: 1,
               autoCalculateDC: false,
            },
            aspect: [rangeAspect('self')],
            customAspect: [{
               label: 'Fly Speed',
               scaling: true,
               initialValue: 5,
               cost: 2,
               resistanceCheck: 'none',
               isDamage: false,
               isHealing: false,
            }],
            description: '<p>Gusts of air carry you over land.</p>',
         }),
      };

      expect(renderSpell(document, realContext())).toBe(
         '#### ***Air Walk*** {#air-walk}\n\n'
         + '**Mind (Arcana) 6:1**  \n**XP Cost:** 2  \n'
         + '**Range:** Self  \n'
         + '**Enhancements:** Fly Speed (5 \\+ ES / 2\\)  \n**Traits:** Air  \n---\n\n'
         + 'Gusts of air carry you over land.  \n---',
      );
   });

   it('escapes the Enhancements line\'s trailing digit-paren byte-equal to the compendium (Air Walk)', () => {
      // Compendium line 4647 (verified via `cat -A`): "**Enhancements:** Minutes (1 \+ ES), Fly Speed
      // (5 \+ ES / 2\)  ". The standard `duration` aspect's `minutes` unit always costs 4 build points
      // (SpellAspects.js's fixed unitCosts table), which would force an unwanted "/ 4" suffix; the
      // compendium's "Minutes (1 \+ ES)" (no suffix, cost 1) is therefore authored as a custom aspect,
      // not the standard `duration` aspect. Modeled that way here.
      /** @type {object} The Air Walk document fixture, matching the compendium's actual Enhancements text. */
      const document = {
         name: 'Air Walk',
         system: makeSystem({
            xpCost: 2,
            tradition: 'Air',
            castingCheck: {
               attribute: 'mind',
               skill: 'arcana',
               difficulty: 6,
               complexity: 1,
               autoCalculateDC: false,
            },
            aspect: [rangeAspect('self')],
            customAspect: [
               scalingCustomAspect('Minutes', 1, 1),
               scalingCustomAspect('Fly Speed', 5, 2),
            ],
            description: '<p>Gusts of air carry you over land.</p>',
         }),
      };

      expect(renderSpell(document, realContext())).toContain(
         '**Enhancements:** Minutes (1 \\+ ES), Fly Speed (5 \\+ ES / 2\\)  \n',
      );
   });

   it('merges a standard scaling aspect and a custom scaling aspect onto one Enhancements line', () => {
      // Verifies the standard-aspect loop and the custom-aspect loop both push into the same
      // `enhancementParts` array, in the order each loop runs (standard aspects, sorted, then customs).
      /** @type {object} The fixture: a `duration`/`rounds` standard aspect plus a custom Fly Speed aspect. */
      const document = {
         name: 'Wind Dash',
         system: makeSystem({
            aspect: [durationAspect('rounds', 1)],
            customAspect: [scalingCustomAspect('Fly Speed', 5, 2)],
         }),
      };

      expect(renderSpell(document, realContext())).toContain(
         '**Enhancements:** Rounds (1 \\+ ES), Fly Speed (5 \\+ ES / 2\\)  \n',
      );
   });

   it('sorts enabled standard aspects by SpellAspects sortOrder, not fixture order', () => {
      // damage (sortOrder 4) is supplied before extraTargets (sortOrder 2); the rendered Enhancements
      // line must list Extra Targets first.
      /** @type {object} The fixture, with standard aspects supplied out of sortOrder. */
      const document = {
         name: 'Scatter Bolt',
         system: makeSystem({
            aspect: [
               damageAspect(),
               extraTargetsAspect()
            ],
         }),
      };

      expect(renderSpell(document, realContext())).toContain(
         '**Enhancements:** Extra Targets (1 \\+ ES), Damage (1 \\+ ES)  \n',
      );
   });

   it('renders an inflictCondition aspect with a single option and a resistance check', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Stun Bolt',
         system: makeSystem({
            aspect: [{
               label: 'inflictCondition',
               option: ['stunned'],
               resistanceCheck: 'resilience',
               allOptions: false,
            }],
         }),
      };

      expect(renderSpell(document, realContext())).toContain(
         '**Inflict Conditions:** Stunned, Resisted by Resilience  \n',
      );
   });

   it('uses the stored difficulty/complexity when autoCalculateDC is false', () => {
      /** @type {object} The fixture with a stored 6:1 casting check and no aspects to recompute from. */
      const document = {
         name: 'Fixed DC Spell',
         system: makeSystem({
            castingCheck: {
               attribute: 'mind',
               skill: 'arcana',
               difficulty: 6,
               complexity: 1,
               autoCalculateDC: false,
            },
         }),
      };

      expect(renderSpell(document, realContext())).toContain('**Mind (Arcana) 6:1**  \n');
   });

   it('escapes Markdown specials in the tradition, custom trait, and custom aspect label', () => {
      /** @type {object} The fixture, with a tradition, custom trait, and non-scaling custom aspect. */
      const document = {
         name: 'Wild Rite',
         system: makeSystem({
            tradition: 'Two+Handed*',
            customTrait: [{ name: 'Two+Handed*' }],
            customAspect: [{
               label: 'Two+Handed*',
               scaling: false,
               initialValue: 1,
               cost: 1,
               resistanceCheck: 'none',
               isDamage: false,
               isHealing: false,
            }],
         }),
      };

      /** @type {string} The rendered block. */
      const result = renderSpell(document, realContext());
      expect(result).toContain('**Two\\+Handed\\*:** 1  \n');
      expect(result).toContain('**Traits:** Two\\+Handed\\*, Two\\+Handed\\*  \n');
   });

   it('omits Range/Area/Enhancements/Traits lines when the spell has none of them', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Bare Spell',
         system: makeSystem(),
      };

      expect(renderSpell(document, realContext())).toBe(
         '#### ***Bare Spell*** {#bare-spell}\n\n'
         + '**Mind (Arcana) 4:1**  \n**XP Cost:** 2  \n---\n\n---',
      );
   });
});
