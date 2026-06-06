import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import CheckTags from '~/document/svelte-components/check/CheckTags.svelte';

/**
 * Builds a stub document bridge exposing one check at `data.system.check[0]`, mirroring the shape both
 * item and effect documents share.
 * @param {object} [checkOverrides] - Field overrides merged onto the default check.
 * @returns {object} The stub bridge for the 'document' context.
 */
function makeBridge(checkOverrides = {}) {
   /** @type {object} The default intrinsic check config used across the cases. */
   const check = {
      label: 'Test Check',
      attribute: 'body',
      skill: 'athletics',
      difficulty: 4,
      complexity: 2,
      resolveCost: 0,
      resistanceCheck: 'none',
      opposedCheck: {
         enabled: false,
         attribute: 'body',
         skill: 'athletics',
      },
      ...checkOverrides,
   };

   return {
      data: {
         system: {
            check: [check],
         },
      },
   };
}

describe('CheckTags', () => {
   beforeEach(() => {
      // localize() routes through game.i18n; identity-stub it for unit renders.
      globalThis.game = {
         i18n: {
            localize: (key) => key,
         },
      };
   });

   it('renders the attribute check tag from the config', () => {
      render(CheckTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge()]]),
      });

      expect(screen.getByTestId('check-tags-attribute')).toBeTruthy();
      expect(screen.queryByTestId('check-tags-resolve-cost')).toBeNull();
      expect(screen.queryByTestId('check-tags-resisted-by')).toBeNull();
      expect(screen.queryByTestId('check-tags-opposed')).toBeNull();
   });

   it('renders resolve cost, resisted-by, and opposed tags when configured', () => {
      render(CheckTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({
            resolveCost: 2,
            resistanceCheck: 'reflexes',
            opposedCheck: {
               enabled: true,
               attribute: 'mind',
               skill: 'perception',
            },
         })]]),
      });

      expect(screen.getByTestId('check-tags-resolve-cost').querySelector('.value').textContent).toBe('2');
      expect(screen.getByTestId('check-tags-resisted-by')).toBeTruthy();
      expect(screen.getByTestId('check-tags-opposed')).toBeTruthy();
   });

   it('prefers the actor-resolved attribute override over the config attribute', () => {
      render(CheckTags, {
         props: {
            idx: 0,
            attribute: 'mind',
         },
         context: new Map([['document', makeBridge({ attribute: 'default' })]]),
      });

      /** @type {string} The rendered attribute tag text. */
      const text = screen.getByTestId('check-tags-attribute').textContent;
      expect(text).toContain('mind');
      expect(text).not.toContain('default');
   });

   it('renders nothing for a missing check index', () => {
      const { container } = render(CheckTags, {
         props: { idx: 7 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(container.querySelector('.check-tags')).toBeNull();
   });
});
