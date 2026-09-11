import { describe, expect, it } from 'vitest';
import { commonStatLines, renderItemBlock } from '~/spreadsheet/markdown/renderers/RenderItemBlock.js';

/**
 * A minimal label resolver for tests that don't need the system's real localized strings.
 * @param {string} key - The label key.
 * @param {string} [fallback] - The fallback text.
 * @returns {string} `fallback` when given, else the key itself.
 */
function fakeLabels(key, fallback) {
   return fallback ?? key;
}

describe('commonStatLines', () => {
   it('omits Rarity when common and Value when zero', () => {
      expect(commonStatLines({
         rarity: 'common',
         value: 0 
      }, fakeLabels)).toEqual([]);
   });

   it('renders Rarity when not common', () => {
      expect(commonStatLines({
         rarity: 'uncommon',
         value: 0 
      }, fakeLabels)).toEqual([
         '**Rarity:** uncommon  ',
      ]);
   });

   it('renders Value when greater than zero', () => {
      expect(commonStatLines({
         rarity: 'common',
         value: 135 
      }, fakeLabels)).toEqual([
         '**Value:** 135  ',
      ]);
   });
});

describe('renderItemBlock', () => {
   it('renders zero stat lines as heading, blank line, then ---', () => {
      expect(renderItemBlock({
         headingText: 'Alert',
         slug: 'alert',
         statLines: [],
         descriptionHtml: '',
      })).toBe('#### ***Alert*** {#alert}\n\n---\n\n---');
   });

   it('renders stat lines followed by --- for a single-attack-shaped item', () => {
      expect(renderItemBlock({
         headingText: 'Battle Axe',
         slug: 'battle-axe',
         statLines: [
            '**Value:** 135  ',
            '**Damage:** 2 \\+ ES  ',
            '**Traits:** Slashing  ',
         ],
         descriptionHtml: '<p>These axes are designed explicitly as weapons, rather than tools.</p>',
      })).toBe(
         '#### ***Battle Axe*** {#battle-axe}\n\n'
         + '**Value:** 135  \n**Damage:** 2 \\+ ES  \n**Traits:** Slashing  \n---\n\n'
         + 'These axes are designed explicitly as weapons, rather than tools.  \n---',
      );
   });

   it('renders an empty description as heading, stats, ---, blank line, ---', () => {
      expect(renderItemBlock({
         headingText: 'Club',
         slug: 'club',
         statLines: ['**Value:** 8  '],
         descriptionHtml: '',
      })).toBe('#### ***Club*** {#club}\n\n**Value:** 8  \n---\n\n---');
   });

   it('renders multi-attack sections: own lines with no ---, then each attack, only the last with ---', () => {
      expect(renderItemBlock({
         headingText: 'Dagger',
         slug: 'dagger',
         statLines: ['**Value:** 20  '],
         descriptionHtml: '<p>A small blade.</p>',
         attackSections: [
            {
               headingText: 'Strike (Melee)',
               slug: 'strike-melee',
               statLines: [
                  '**Damage:** 1 \\+ ES  ',
                  '**Traits:** Flurry, Slashing  '
               ],
            },
            {
               headingText: 'Throw (Ranged)',
               slug: 'throw-ranged',
               statLines: [
                  '**Damage:** 1 \\+ ES  ',
                  '**Range:** 5 spaces  ',
                  '**Traits:** Slashing  '
               ],
            },
         ],
      })).toBe(
         '#### ***Dagger*** {#dagger}\n\n'
         + '**Value:** 20\n\n'
         + '##### ***Strike (Melee)*** {#strike-melee}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Traits:** Flurry, Slashing\n\n'
         + '##### ***Throw (Ranged)*** {#throw-ranged}\n\n'
         + '**Damage:** 1 \\+ ES  \n**Range:** 5 spaces  \n**Traits:** Slashing  \n---\n\n'
         + 'A small blade.  \n---',
      );
   });

   it('does not double the blank line before the first attack when there are no own stat lines', () => {
      expect(renderItemBlock({
         headingText: 'Twin Fangs',
         slug: 'twin-fangs',
         statLines: [],
         descriptionHtml: '',
         attackSections: [
            {
               headingText: 'Bite (Melee)',
               slug: 'bite-melee',
               statLines: ['**Damage:** 1 \\+ ES  '],
            },
         ],
      })).toBe(
         '#### ***Twin Fangs*** {#twin-fangs}\n\n'
         + '##### ***Bite (Melee)*** {#bite-melee}\n\n'
         + '**Damage:** 1 \\+ ES  \n---\n\n---',
      );
   });

   it('renders extraDescriptionHtml as an additional paragraph group under the same closing ---', () => {
      expect(renderItemBlock({
         headingText: 'Longbow',
         slug: 'longbow',
         statLines: ['**Value:** 50  '],
         descriptionHtml: '<p>A tall bow.</p>',
         extraDescriptionHtml: '<p>Requires two hands to draw.</p>',
      })).toBe(
         '#### ***Longbow*** {#longbow}\n\n**Value:** 50  \n---\n\n'
         + 'A tall bow.\n\nRequires two hands to draw.  \n---',
      );
   });

   it('omits a blank extraDescriptionHtml entirely', () => {
      expect(renderItemBlock({
         headingText: 'Sling',
         slug: 'sling',
         statLines: [],
         descriptionHtml: '<p>A leather strap.</p>',
         extraDescriptionHtml: '',
      })).toBe('#### ***Sling*** {#sling}\n\n---\n\nA leather strap.  \n---');
   });
});
