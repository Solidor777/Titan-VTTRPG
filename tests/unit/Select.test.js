import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import Select from '~/helpers/svelte-components/input/select/Select.svelte';

beforeEach(() => {
   // localize() routes through game.i18n; unwrap the `LOCAL.<key>.text` shape back to the key.
   globalThis.game = {
      i18n: {
         localize: (key) => key.replace(/^LOCAL\.(.+)\.text$/, '$1'),
      },
   };
});

afterEach(() => cleanup());

describe('Select', () => {
   it('renders the selected option label on the trigger', () => {
      render(Select, { props: { options: ['body', 'mind', 'soul'], value: 'mind' } });
      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('mind');
      expect(trigger.getAttribute('data-value')).toBe('mind');
   });

   it('opens the list on click and commits a clicked option', async () => {
      const onchange = vi.fn();
      render(Select, {
         props: {
            options: ['body', 'mind', 'soul'],
            value: 'body',
            onchange,
         },
      });
      const trigger = screen.getByRole('combobox');

      await fireEvent.click(trigger);
      const opts = screen.getAllByRole('option');
      expect(opts).toHaveLength(3);

      await fireEvent.click(screen.getByText('soul'));
      expect(onchange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('combobox').getAttribute('data-value')).toBe('soul');
   });

   it('clamps an out-of-range value to the first option and fires onchange', async () => {
      const onchange = vi.fn();
      render(Select, {
         props: {
            options: ['body', 'mind'],
            value: 'not-a-real-value',
            onchange,
         },
      });
      // The clamp effect resets to the first option and notifies.
      await expect.poll(() => screen.getByRole('combobox').getAttribute('data-value')).toBe('body');
      expect(onchange).toHaveBeenCalled();
   });

   it('disables the trigger when disabled', () => {
      render(Select, { props: { options: ['body'], value: 'body', disabled: true } });
      expect(screen.getByRole('combobox').disabled).toBe(true);
   });
});
