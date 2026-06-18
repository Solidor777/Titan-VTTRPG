import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/svelte';
import SelectList from '~/helpers/svelte-components/input/select/SelectList.svelte';

/** @type {(node: HTMLElement) => { destroy: () => void }} A no-op stand-in for the floating action. */
const noopAction = () => ({ destroy() {} });

beforeEach(() => {
   // localize() routes through game.i18n; unwrap the `LOCAL.<key>.text` shape back to the key.
   globalThis.game = {
      i18n: {
         localize: (key) => key.replace(/^LOCAL\.(.+)\.text$/, '$1'),
      },
   };
});

afterEach(() => cleanup());

describe('SelectList', () => {
   it('renders one role=option per option with its icon and data-value', () => {
      render(SelectList, {
         props: {
            options: [
               { value: 'body', label: 'body', icon: 'fas fa-hand-fist' },
               { value: 'mind', label: 'mind', icon: 'fas fa-brain' },
            ],
            value: 'body',
            hoverIndex: 0,
            listId: 'titan-select-test',
            testId: void 0,
            floatingContent: noopAction,
            onselect: () => {},
            onhover: () => {},
         },
      });

      const opts = screen.getAllByRole('option');
      expect(opts).toHaveLength(2);
      expect(opts[0].getAttribute('data-value')).toBe('body');
      expect(opts[0].querySelector('i.fa-hand-fist')).not.toBeNull();
      expect(opts[0].getAttribute('aria-selected')).toBe('true');
   });

   it('fires onselect with the clicked option', async () => {
      const onselect = vi.fn();
      render(SelectList, {
         props: {
            options: [
               { value: 'body', label: 'body' },
               { value: 'mind', label: 'mind' },
            ],
            value: 'body',
            hoverIndex: 0,
            listId: 'titan-select-test',
            floatingContent: noopAction,
            onselect,
            onhover: () => {},
         },
      });

      await fireEvent.click(screen.getByText('mind'));
      expect(onselect).toHaveBeenCalledWith(expect.objectContaining({ value: 'mind' }));
   });
});
