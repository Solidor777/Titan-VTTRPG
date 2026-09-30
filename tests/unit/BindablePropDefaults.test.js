import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import CheckboxInput from '~/helpers/svelte-components/input/CheckboxInput.svelte';
import ExpandButton from '~/helpers/svelte-components/button/ExpandButton.svelte';
import BoundFieldHarness from './fixtures/BoundFieldHarness.svelte';

beforeEach(() => {
   // localize() routes through game.i18n; unwrap the `LOCAL.<key>.text` shape back to the key.
   globalThis.game = {
      i18n: {
         localize: (key) => key.replace(/^LOCAL\.(.+)\.text$/, '$1'),
      },
   };
});

afterEach(() => cleanup());

describe('CheckboxInput defaults', () => {
   it('renders unchecked when unbound and checks on click', async () => {
      render(CheckboxInput);
      const button = screen.getByRole('button');
      expect(button.querySelector('i.fa-check')).toBeNull();

      await fireEvent.click(button);
      expect(button.querySelector('i.fa-check')).not.toBeNull();
   });

   it('renders unchecked without throwing when bound to an undefined field, and writes the toggle back', async () => {
      render(BoundFieldHarness, {
         props: {
            component: CheckboxInput,
            prop: 'value',
         },
      });
      const button = screen.getByRole('button');
      expect(button.querySelector('i.fa-check')).toBeNull();
      expect(screen.getByTestId('field').textContent).toBe('undefined');

      await fireEvent.click(button);
      expect(button.querySelector('i.fa-check')).not.toBeNull();
      expect(screen.getByTestId('field').textContent).toBe('true');
   });
});

describe('ExpandButton defaults', () => {
   it('renders collapsed when unbound and expands on click', async () => {
      render(ExpandButton);
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('expand');

      await fireEvent.click(button);
      expect(button.getAttribute('aria-label')).toBe('collapse');
   });

   it('renders collapsed without throwing when bound to an undefined field, and writes the toggle back', async () => {
      render(BoundFieldHarness, {
         props: {
            component: ExpandButton,
            prop: 'expanded',
         },
      });
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe('expand');

      await fireEvent.click(button);
      expect(button.getAttribute('aria-label')).toBe('collapse');
      expect(screen.getByTestId('field').textContent).toBe('true');
   });
});
