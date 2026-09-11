import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createLabels } from '~/spreadsheet/markdown/Labels.js';
import { renderCompendiumMarkdown } from '~/spreadsheet/markdown/RenderCompendiumMarkdown.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {object} The system's real English localization map. */
const realLang = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../lang/en.json'), 'utf-8'));

/** @type {function(string, string=): string} The system's real label resolver. */
const labels = createLabels(realLang);

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
      plusExtraSuccessDamage: false,
      trait: [],
      customTrait: [],
      ...overrides,
   };
}

/**
 * Builds a minimal Spell `system` fixture, overridden per test.
 * @param {object} [overrides] - Fields to override.
 * @returns {object} The `system` fixture.
 */
function makeSpellSystem(overrides = {}) {
   return {
      rarity: 'common',
      value: 0,
      xpCost: 1,
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

describe('renderCompendiumMarkdown', () => {
   it('renders a small pack: title, contents (incl. item and attack headings), sections, and blocks', () => {
      /**
       * @type {object[]} A two-attack weapon, two unfoldered spells (one blank, one traditioned), a
       *    foldered commodity.
       */
      const documents = [
         {
            type: 'weapon',
            name: 'Dagger',
            folderPath: [],
            system: {
               rarity: 'common',
               value: 20,
               attack: [
                  makeAttack({ label: 'Slash', type: 'melee' }),
                  makeAttack({ label: 'Throw', type: 'ranged', attribute: 'body', skill: 'rangedWeapons' }),
               ],
               attackNotes: '',
               trait: [],
               check: [],
               description: '<p>A small blade.</p>',
            },
         },
         {
            type: 'spell',
            name: 'Light',
            folderPath: [],
            system: makeSpellSystem({ description: '<p>A gentle glow.</p>' }),
         },
         {
            type: 'spell',
            name: 'Blast',
            folderPath: [],
            system: makeSpellSystem({ xpCost: 2, tradition: 'fire', description: '<p>A burst of flame.</p>' }),
         },
         {
            type: 'commodity',
            name: 'Rope',
            folderPath: ['Trade Goods'],
            system: { rarity: 'common', value: 5, description: '' },
         },
      ];

      expect(renderCompendiumMarkdown(documents, { title: 'Test Pack', labels })).toBe(
         '# Test Pack {#test-pack}\n\n'
         + '# Contents {#contents}\n\n'
         + '[Test Pack](#test-pack)\n\n'
         + '[Contents](#contents)\n\n'
         + '[Weapons](#weapons)\n\n'
         + '[Dagger](#dagger)\n\n'
         + '[Slash (Melee)](#slash-melee)\n\n'
         + '[Throw (Ranged)](#throw-ranged)\n\n'
         + '[Spells](#spells)\n\n'
         + '[Light](#light)\n\n'
         + '[Fire](#fire)\n\n'
         + '[Blast](#blast)\n\n'
         + '[Trade Goods](#trade-goods)\n\n'
         + '[Rope](#rope)\n\n'
         + '# Weapons {#weapons}\n\n'
         + '#### ***Dagger*** {#dagger}\n\n'
         + '**Value:** 20\n\n'
         + '##### ***Slash (Melee)*** {#slash-melee}\n\n'
         + '**Damage:** 1\n\n'
         + '##### ***Throw (Ranged)*** {#throw-ranged}\n\n'
         + '**Damage:** 1  \n---\n\n'
         + 'A small blade.  \n---\n\n'
         + '# Spells {#spells}\n\n'
         + '#### ***Light*** {#light}\n\n'
         + '**Mind (Arcana) 4:1**  \n**XP Cost:** 1  \n---\n\n'
         + 'A gentle glow.  \n---\n\n'
         + '### **Fire** {#fire}\n\n'
         + '#### ***Blast*** {#blast}\n\n'
         + '**Mind (Arcana) 4:1**  \n**XP Cost:** 2  \n**Traits:** fire  \n---\n\n'
         + 'A burst of flame.  \n---\n\n'
         + '# Trade Goods {#trade-goods}\n\n'
         + '#### ***Rope*** {#rope}\n\n'
         + '**Value:** 5  \n---\n\n'
         + '---\n',
      );
   });

   it('deduplicates a repeated heading text with -1, -2, ... suffixes in document order', () => {
      /** @type {object[]} Two root-level commodities that happen to share a name. */
      const documents = [
         { type: 'commodity', name: 'Rope', folderPath: [], system: { rarity: 'common', value: 1, description: '' } },
         { type: 'commodity', name: 'Rope', folderPath: [], system: { rarity: 'common', value: 2, description: '' } },
      ];

      /** @type {string} The rendered file. */
      const result = renderCompendiumMarkdown(documents, { title: 'Test Pack', labels });

      expect(result).toContain('#### ***Rope*** {#rope}\n\n**Value:** 1');
      expect(result).toContain('#### ***Rope*** {#rope-1}\n\n**Value:** 2');
      expect(result).toContain('[Rope](#rope)');
      expect(result).toContain('[Rope](#rope-1)');
   });

   it('ends the file with a single trailing newline', () => {
      /** @type {object[]} A single root-level commodity. */
      const documents = [
         { type: 'commodity', name: 'Rope', folderPath: [], system: { rarity: 'common', value: 1, description: '' } },
      ];

      /** @type {string} The rendered file. */
      const result = renderCompendiumMarkdown(documents, { title: 'Test Pack', labels });

      expect(result.endsWith('\n')).toBe(true);
      expect(result.endsWith('\n\n')).toBe(false);
   });
});
