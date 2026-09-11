import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { createSlugger } from '~/spreadsheet/markdown/Slug.js';
import { renderWeapon } from '~/spreadsheet/markdown/renderers/RenderWeapon.js';

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
 * Builds a minimal Weapon Attack fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The attack fixture.
 */
function makeAttack(overrides = {}) {
   return {
      label: 'Attack',
      type: 'melee',
      range: 1,
      attribute: 'body',
      skill: 'meleeWeapons',
      damage: 1,
      plusExtraSuccessDamage: true,
      trait: [],
      customTrait: [],
      ...overrides,
   };
}

/**
 * Builds a minimal Weapon `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSystem(overrides = {}) {
   return {
      rarity: 'common',
      value: 0,
      attack: [makeAttack()],
      attackNotes: '',
      trait: [],
      check: [],
      description: '',
      ...overrides,
   };
}

describe('renderWeapon', () => {
   it('reproduces the compendium Battle Axe (single attack, crushing/slashing trait, no checks)', () => {
      /** @type {object} The Battle Axe document fixture. */
      const document = {
         name: 'Battle Axe',
         system: makeSystem({
            value: 135,
            attack: [makeAttack({
               damage: 2,
               plusExtraSuccessDamage: true,
               trait: [{ name: 'slashing', value: true }],
            })],
            description: '<p>These axes are designed explicitly as weapons, rather than tools.</p>',
         }),
      };

      expect(renderWeapon(document, realContext())).toBe(
         '#### ***Battle Axe*** {#battle-axe}\n\n'
         + '**Value:** 135  \n**Damage:** 2 \\+ ES  \n**Traits:** Slashing  \n---\n\n'
         + 'These axes are designed explicitly as weapons, rather than tools.  \n---',
      );
   });

   it('reproduces the compendium Dagger (two attacks: Strike melee, Throw ranged)', () => {
      /** @type {object} The Dagger document fixture. */
      const document = {
         name: 'Dagger',
         system: makeSystem({
            value: 20,
            attack: [
               makeAttack({
                  label: 'Strike',
                  type: 'melee',
                  damage: 1,
                  trait: [
                     { name: 'flurry', value: true },
                     { name: 'slashing', value: true },
                  ],
               }),
               makeAttack({
                  label: 'Throw',
                  type: 'ranged',
                  attribute: 'body',
                  skill: 'rangedWeapons',
                  damage: 1,
                  range: 5,
                  trait: [{ name: 'slashing', value: true }],
               }),
            ],
            description: '<p>This small, bladed weapon is held in one hand and used to stab a creature in '
               + 'close combat. It can also be thrown at short range.</p>',
         }),
      };

      expect(renderWeapon(document, realContext())).toBe(
         '#### ***Dagger*** {#dagger}\n\n'
         + '**Value:** 20  \n\n'
         + '##### ***Strike (Melee)*** {#strike-melee}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Traits:** Flurry, Slashing  \n\n'
         + '##### ***Throw (Ranged)*** {#throw-ranged}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Range:** 5 spaces  \n**Traits:** Slashing  \n---\n\n'
         + 'This small, bladed weapon is held in one hand and used to stab a creature in close combat. '
         + 'It can also be thrown at short range.  \n---',
      );
   });

   it('renders a data-driven Damage line for a weapon the compendium happens to omit it for', () => {
      // The compendium's Weighted Gauntlet entry omits the Damage line (a compendium inconsistency,
      // not a rendering rule); the renderer always emits it from the data.
      /** @type {object} The Weighted Gauntlet document fixture. */
      const document = {
         name: 'Weighted Gauntlet',
         system: makeSystem({
            value: 35,
            attack: [makeAttack({
               damage: 1,
               trait: [
                  { name: 'crushing', value: true },
                  { name: 'flurry', value: true },
               ],
            })],
         }),
      };

      expect(renderWeapon(document, realContext())).toBe(
         '#### ***Weighted Gauntlet*** {#weighted-gauntlet}\n\n'
         + '**Value:** 35  \n**Damage:** 1 \\+ ES  \n**Traits:** Crushing, Flurry  \n---\n\n---',
      );
   });

   it('omits the Damage line\'s ES suffix when plusExtraSuccessDamage is false', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Sling',
         system: makeSystem({
            attack: [makeAttack({ damage: 3, plusExtraSuccessDamage: false })],
         }),
      };

      expect(renderWeapon(document, realContext())).toContain('**Damage:** 3  \n');
   });

   it('renders a Check line only when the attribute/skill pair differs from the type default', () => {
      /** @type {object} The fixture, using an off-default skill for a melee attack. */
      const document = {
         name: 'Odd Blade',
         system: makeSystem({
            attack: [makeAttack({ attribute: 'body', skill: 'athletics' })],
         }),
      };

      expect(renderWeapon(document, realContext())).toContain('**Check:** Body (Athletics)  \n');
   });

   it('renders weapon-level Traits before the attack lines when system.trait is non-empty', () => {
      /** @type {object} The fixture with a weapon-level Two-Handed trait. */
      const document = {
         name: 'Greatsword',
         system: makeSystem({
            trait: [{ name: 'twoHanded', value: true }],
         }),
      };

      /** @type {string} The rendered block. */
      const result = renderWeapon(document, realContext());
      expect(result).toBe(
         '#### ***Greatsword*** {#greatsword}\n\n'
         + '**Traits:** Two-Handed  \n**Damage:** 1 \\+ ES  \n---\n\n---',
      );
   });

   it('renders item checks after the attack lines, on a single-attack weapon', () => {
      /** @type {object} The fixture with one item check. */
      const document = {
         name: 'Poison Blade',
         system: makeSystem({
            check: [{
               label: 'Poison',
               attribute: 'body',
               skill: 'meleeWeapons',
               difficulty: 4,
               complexity: 1,
               resolveCost: 0,
               isDamage: false,
               isHealing: false,
               scaling: true,
               resistanceCheck: 'resilience',
               initialValue: 1,
            }],
         }),
      };

      /** @type {string} The rendered block. */
      const result = renderWeapon(document, realContext());
      expect(result).toBe(
         '#### ***Poison Blade*** {#poison-blade}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Poison:** Body (Melee Weapons) 4:1, Resisted by Resilience  \n---\n\n---',
      );
   });

   it('renders item checks after the attack sections, appended to the last attack, on a multi-attack weapon', () => {
      /** @type {object} The fixture with two attacks and one item check. */
      const document = {
         name: 'Twin Fangs',
         system: makeSystem({
            attack: [
               makeAttack({ label: 'Bite' }),
               makeAttack({ label: 'Sting' }),
            ],
            check: [{
               label: 'Poison',
               attribute: 'body',
               skill: 'meleeWeapons',
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

      /** @type {string} The rendered block. */
      const result = renderWeapon(document, realContext());
      expect(result).toBe(
         '#### ***Twin Fangs*** {#twin-fangs}\n\n'
         + '##### ***Bite (Melee)*** {#bite-melee}\n\n'
         + '**Damage:** 1 \\+ ES  \n\n'
         + '##### ***Sting (Melee)*** {#sting-melee}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Poison:** Body (Melee Weapons) 4:1  \n---\n\n---',
      );
   });

   it('renders attackNotes as an additional paragraph group before the closing ---', () => {
      /** @type {object} The fixture. */
      const document = {
         name: 'Net',
         system: makeSystem({
            description: '<p>A weighted net.</p>',
            attackNotes: '<p>A restrained target cannot move.</p>',
         }),
      };

      expect(renderWeapon(document, realContext())).toBe(
         '#### ***Net*** {#net}\n\n**Damage:** 1 \\+ ES  \n---\n\n'
         + 'A weighted net.\n\nA restrained target cannot move.  \n---',
      );
   });
});
