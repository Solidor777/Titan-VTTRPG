import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import AttributeSelect from '~/helpers/svelte-components/input/select/AttributeSelect.svelte';
import AttackTypeSelect from '~/helpers/svelte-components/input/select/AttackTypeSelect.svelte';

beforeEach(() => {
   // localize() routes through game.i18n; unwrap the `LOCAL.<key>.text` shape back to the key.
   globalThis.game = {
      i18n: {
         localize: (key) => key.replace(/^LOCAL\.(.+)\.text$/, '$1'),
      },
   };
});

afterEach(() => cleanup());

describe('AttributeSelect / AttackTypeSelect icons', () => {
   it('shows the attribute icon on the trigger and colors each row by its attribute', async () => {
      render(AttributeSelect, { props: { value: 'body' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.querySelector('i.fa-hand-fist')).not.toBeNull();

      await fireEvent.click(trigger);
      const mind = screen.getByRole('option', { name: /mind/i });
      expect(mind.querySelector('i.fa-brain')).not.toBeNull();

      // Each row carries its attribute class so the attribute-colors mixin tints it.
      expect(mind.querySelector('.attribute-option.mind')).not.toBeNull();
      expect(screen.getByRole('option', { name: /body/i }).querySelector('.attribute-option.body')).not.toBeNull();
      expect(screen.getByRole('option', { name: /soul/i }).querySelector('.attribute-option.soul')).not.toBeNull();
   });

   it('shows the attack-type icons (melee sword, ranged bow)', async () => {
      render(AttackTypeSelect, { props: { value: 'melee' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.querySelector('i.fa-sword')).not.toBeNull();

      await fireEvent.click(trigger);
      const ranged = screen.getByRole('option', { name: /ranged/i });
      expect(ranged.querySelector('i.fa-bow-arrow')).not.toBeNull();
   });
});
