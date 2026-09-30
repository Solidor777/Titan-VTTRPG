import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/svelte';
import EffectTag from '~/helpers/svelte-components/tag/effects/EffectTag.svelte';

// A report entry's tooltip: a condition's description is localized at render from its stored key; an entry without a
// key shows its stored text; the tooltip is localized once. tippy.js sets `_tippy` on the element it is created on
// (tippy.esm.js `reference._tippy = instance`), so the content is read from there.

beforeEach(() => {
   // Brackets mark each localization, so a second localization of already-localized text shows as nested brackets.
   globalThis.game = {
      i18n: {
         localize: (key) => `[${key}]`,
      },
   };
});

afterEach(() => {
   cleanup();
   delete globalThis.game;
});

/**
 * Renders a report entry and reads its tooltip content.
 * @param {object} effect - The report entry.
 * @returns {string} The tooltip content tippy holds.
 */
function renderTooltip(effect) {
   render(EffectTag, {
      props: {
         effect,
         testId: 'report-entry',
      },
   });
   return screen.getByTestId('report-entry')._tippy?.props.content;
}

describe('EffectTag tooltip', () => {
   it('localizes a condition entry\'s description key on this client', () => {
      expect(renderTooltip({
         descriptionKey: 'blinded.desc',
         img: 'blinded.svg',
         label: 'Blinded',
      })).toBe('[LOCAL.effect.custom.desc.text][LOCAL.blinded.desc.text]');
   });

   it('prefers the key over stored text', () => {
      expect(renderTooltip({
         description: '<p>Stored text</p>',
         descriptionKey: 'blinded.desc',
         img: 'blinded.svg',
         label: 'Blinded',
      })).toBe('[LOCAL.effect.custom.desc.text][LOCAL.blinded.desc.text]');
   });

   it('shows the stored description of an entry without a key (an effect, or an older report\'s condition)', () => {
      expect(renderTooltip({
         description: '<p>Stored text</p>',
         img: 'blade.webp',
         label: 'Poisoned Blade',
      })).toBe('[LOCAL.effect.custom.desc.text]<p>Stored text</p>');
   });

   it('shows only the lead text for an entry without a description', () => {
      expect(renderTooltip({
         img: 'blade.webp',
         label: 'Poisoned Blade',
      })).toBe('[LOCAL.effect.custom.desc.text]');
   });
});
