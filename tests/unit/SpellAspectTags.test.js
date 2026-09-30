import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/svelte';
import SpellAspectTags from '~/helpers/svelte-components/tag/SpellAspectTags.svelte';
import selectDisplayedSpellAspects from '~/document/types/item/types/spell/SelectDisplayedSpellAspects.js';

/** @type {object | undefined} The `game` global in place before each test, restored after it. */
let previousGame;

beforeEach(() => {
   previousGame = globalThis.game;

   // localize() routes through game.i18n; unwrap the `LOCAL.<key>.text` shape back to the key.
   globalThis.game = {
      i18n: {
         localize: (key) => key.replace(/^LOCAL\.(.+)\.text$/, '$1'),
      },
   };
});

afterEach(() => {
   cleanup();
   if (previousGame === undefined) {
      delete globalThis.game;
   } else {
      globalThis.game = previousGame;
   }
});

/**
 * Reads the label of every rendered aspect tag, in document order.
 * @param {HTMLElement} container - The render container.
 * @returns {string[]} The trimmed label text of each tag, top to bottom.
 */
function readTagLabels(container) {
   return [...container.querySelectorAll('.tag-container > .tag .label')].map((label) => label.textContent.trim());
}

describe('SpellAspectTags', () => {
   it('lists the tags from smallest to largest, keeping the display order for equal sizes', () => {
      /** @type {object[]} Standard aspects: damage has size 4 (scaling + three options), range has size 0. */
      const standardAspects = [
         {
            label: 'damage',
            initialValue: 1,
            scaling: true,
            option: [
               'fire',
               'cold',
               'acid',
            ],
            enabled: true,
         },
         {
            label: 'range',
            initialValue: 'self',
            enabled: true,
         },
      ];

      /**
       * @type {object[]} Custom aspects: Ward has size 2 (a resistance check), Glow and Hush have size 0 (Hush's
       * `'none'` resistance is no resistance check).
       */
      const customAspects = [
         {
            label: 'Ward',
            initialValue: 1,
            resistanceCheck: 'reflexes',
            uuid: 'custom-ward',
         },
         {
            label: 'Glow',
            initialValue: 1,
            uuid: 'custom-glow',
         },
         {
            label: 'Hush',
            initialValue: 1,
            resistanceCheck: 'none',
            uuid: 'custom-hush',
         },
      ];

      /** @type {{ container: HTMLElement }} The render result, holding the rendered tags. */
      const { container } = render(SpellAspectTags, {
         props: {
            aspects: selectDisplayedSpellAspects(standardAspects, customAspects),
         },
      });

      expect(readTagLabels(container)).toEqual([
         'range',
         'Glow',
         'Hush',
         'Ward',
         'damage',
      ]);
   });
});
