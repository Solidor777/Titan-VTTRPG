import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import AttackTags from '~/document/types/item/types/weapon/components/AttackTags.svelte';

/**
 * Builds a stub document bridge exposing one weapon attack at `data.system.attack[0]`. Traits are kept
 * empty here to focus these cases on the scalar tags; trait rendering (standard + custom) is covered by
 * `tests/unit/CharacterSheetWeaponAttack.test.js` and the e2e parity spec (`tests/e2e/attack-tags.spec.js`).
 * @param {object} [attackOverrides] - Field overrides merged onto the default attack.
 * @returns {object} The stub bridge for the 'document' context.
 */
function makeBridge(attackOverrides = {}) {
   /** @type {object} The default intrinsic attack used across the cases. */
   const attack = {
      label: 'Strike',
      type: 'melee',
      damage: 3,
      plusExtraSuccessDamage: false,
      range: 1,
      attribute: 'body',
      skill: 'meleeWeapons',
      trait: [],
      customTrait: [],
      ...attackOverrides,
   };

   return {
      data: {
         system: {
            attack: [attack],
         },
      },
   };
}

describe('AttackTags', () => {
   beforeEach(() => {
      // localize() routes through game.i18n; identity-stub it for unit renders.
      globalThis.game = {
         i18n: {
            localize: (key) => key,
         },
      };
   });

   it('renders the damage tag with damageMod added to the intrinsic damage', () => {
      render(AttackTags, {
         props: {
            idx: 0,
            damageMod: 2,
         },
         context: new Map([['document', makeBridge()]]),
      });

      expect(screen.getByTestId('attack-tags-damage').querySelector('.value').textContent).toBe('5');
   });

   it('renders intrinsic damage when damageMod is omitted and appends the extra-successes suffix', () => {
      render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({ plusExtraSuccessDamage: true })]]),
      });

      /** @type {string} The rendered damage value text. */
      const text = screen.getByTestId('attack-tags-damage').querySelector('.value').textContent;
      expect(text).toContain('3');
      expect(text).toContain('+');
   });

   it('hides the range tag at range 1 and shows it otherwise', () => {
      const first = render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(screen.queryByTestId('attack-tags-range')).toBeNull();
      first.unmount();

      render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', makeBridge({ range: 4 })]]),
      });
      expect(screen.getByTestId('attack-tags-range').querySelector('.value').textContent).toBe('4');
   });

   it('renders nothing for a missing attack index', () => {
      const { container } = render(AttackTags, {
         props: { idx: 7 },
         context: new Map([['document', makeBridge()]]),
      });
      expect(container.querySelector('.attack-tags')).toBeNull();
   });

   it('renders nothing during the deletion window when the bridge data is undefined', () => {
      const { container } = render(AttackTags, {
         props: { idx: 0 },
         context: new Map([['document', { data: undefined }]]),
      });
      expect(container.querySelector('.attack-tags')).toBeNull();
   });
});
